import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  updateDoc,
  getDocFromServer,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserAccount, UserRole, Lesson, LessonPdfFile, LessonMp3Video } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must specify firestoreDatabaseId according to Firebase skill
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on application boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Conexão com Firestore offline.");
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// AUTENTICAÇÃO E PERFIS COM SEPARAÇÃO ESTRITA DE PAPÉIS (PROFESSOR E ALUNO)
// ---------------------------------------------------------------------------

export interface FirebaseAuthResult {
  success: boolean;
  user?: UserAccount;
  error?: string;
}

/**
 * Criação de conta (Cadastro) com Email e Senha.
 * Salva o perfil geral em 'users/{uid}' e também na coleção dedicada
 * 'professores/{uid}' ou 'alunos/{uid}' para garantir separação de perfis.
 */
export async function firebaseSignUp(params: {
  email: string;
  pass: string;
  nome: string;
  matricula: string;
  role: UserRole;
  turmaOuArea?: string;
}): Promise<FirebaseAuthResult> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, params.email.trim(), params.pass);
    const uid = cred.user.uid;

    const userProfile: UserAccount = {
      id: uid,
      name: params.nome.trim(),
      email: params.email.trim(),
      matricula: params.matricula.trim() || `MAT-${Date.now().toString().slice(-4)}`,
      role: params.role,
      turmaOuArea: params.turmaOuArea?.trim() || '',
      createdAt: new Date().toISOString().split('T')[0]
    };

    // 1. Salva na coleção geral 'users'
    try {
      await setDoc(doc(db, 'users', uid), userProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }

    // 2. Salva na coleção específica (professores ou alunos)
    if (params.role === 'professor') {
      try {
        await setDoc(doc(db, 'professores', uid), {
          id: uid,
          name: userProfile.name,
          email: userProfile.email,
          matricula: userProfile.matricula,
          area: userProfile.turmaOuArea || 'Docência Geral',
          createdAt: userProfile.createdAt
        });
      } catch (err) {
        console.warn('Erro ao salvar em professores:', err);
      }
    } else {
      try {
        await setDoc(doc(db, 'alunos', uid), {
          id: uid,
          name: userProfile.name,
          email: userProfile.email,
          matricula: userProfile.matricula,
          turma: userProfile.turmaOuArea || 'Turma Geral',
          createdAt: userProfile.createdAt
        });
      } catch (err) {
        console.warn('Erro ao salvar em alunos:', err);
      }
    }

    return {
      success: true,
      user: userProfile
    };
  } catch (err: any) {
    console.error('Erro no cadastro:', err);
    let msg = 'Erro ao realizar cadastro.';
    if (err.code === 'auth/email-already-in-use') {
      msg = 'Este e-mail já está cadastrado no sistema.';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'Formato de e-mail inválido.';
    } else if (err.code === 'auth/weak-password') {
      msg = 'A senha deve conter no mínimo 6 caracteres.';
    } else if (err.message) {
      msg = err.message;
    }
    return {
      success: false,
      error: msg
    };
  }
}

/**
 * Login com validação de papel estrita:
 * Se um Aluno tentar logar no portal de Professor, o acesso é bloqueado.
 * Se um Professor tentar logar no portal de Aluno, o acesso é bloqueado.
 */
export async function firebaseSignIn(
  email: string, 
  pass: string, 
  expectedRole?: UserRole
): Promise<FirebaseAuthResult> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const uid = cred.user.uid;

    let profile: UserAccount | null = null;
    const userDocRef = doc(db, 'users', uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        profile = snap.data() as UserAccount;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }

    // Se não existia perfil no users, checa coleções específicas
    if (!profile) {
      const profSnap = await getDoc(doc(db, 'professores', uid));
      if (profSnap.exists()) {
        const pd = profSnap.data();
        profile = {
          id: uid,
          name: pd.name || 'Professor',
          email: pd.email || cred.user.email || '',
          matricula: pd.matricula || '',
          role: 'professor',
          turmaOuArea: pd.area || '',
          createdAt: pd.createdAt || new Date().toISOString().split('T')[0]
        };
        await setDoc(userDocRef, profile);
      } else {
        const aluSnap = await getDoc(doc(db, 'alunos', uid));
        if (aluSnap.exists()) {
          const ad = aluSnap.data();
          profile = {
            id: uid,
            name: ad.name || 'Aluno',
            email: ad.email || cred.user.email || '',
            matricula: ad.matricula || '',
            role: 'aluno',
            turmaOuArea: ad.turma || '',
            createdAt: ad.createdAt || new Date().toISOString().split('T')[0]
          };
          await setDoc(userDocRef, profile);
        }
      }
    }

    // Fallback: caso seja o primeiro login sem registro de perfil prévio
    if (!profile) {
      profile = {
        id: uid,
        name: cred.user.displayName || email.split('@')[0],
        email: cred.user.email || email,
        matricula: `MAT-${uid.slice(0, 6)}`,
        role: expectedRole || 'aluno',
        createdAt: new Date().toISOString().split('T')[0]
      };
      await setDoc(userDocRef, profile);
    }

    // VALIDAÇÃO ESTRITA DO PAPEL DO USUÁRIO
    if (expectedRole && profile.role !== expectedRole) {
      // Desconecta a sessão para não manter logado com permissão incorreta
      await signOut(auth);

      if (expectedRole === 'professor' && profile.role === 'aluno') {
        return {
          success: false,
          error: 'Acesso Negado: Esta conta está registrada como ALUNO. Alunos não possuem permissão para acessar o Portal do Professor. Por favor, acerte a seleção e entre em "Sou Aluno".'
        };
      }

      if (expectedRole === 'aluno' && profile.role === 'professor') {
        return {
          success: false,
          error: 'Acesso Negado: Esta conta pertence a um PROFESSOR. Por favor, acesse pelo Portal do Professor selecionando a opção "Sou Professor".'
        };
      }
    }

    return {
      success: true,
      user: profile
    };
  } catch (err: any) {
    console.error('Erro no login:', err);
    let msg = 'Credenciais inválidas. Verifique seu e-mail e senha.';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = 'E-mail ou senha incorretos.';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'Formato de e-mail inválido.';
    } else if (err.message) {
      msg = err.message;
    }
    return {
      success: false,
      error: msg
    };
  }
}

/**
 * Login com Google Popup com verificação estrita de papéis
 */
export async function firebaseSignInWithGoogle(expectedRole?: UserRole): Promise<FirebaseAuthResult> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const uid = cred.user.uid;

    let profile: UserAccount | null = null;
    const userDocRef = doc(db, 'users', uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        profile = snap.data() as UserAccount;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }

    if (!profile) {
      profile = {
        id: uid,
        name: cred.user.displayName || 'Usuário Google',
        email: cred.user.email || '',
        matricula: `G-${uid.slice(0, 6)}`,
        role: expectedRole || 'aluno',
        createdAt: new Date().toISOString().split('T')[0]
      };
      await setDoc(userDocRef, profile);

      // Registra na coleção específica
      if (profile.role === 'professor') {
        await setDoc(doc(db, 'professores', uid), {
          id: uid,
          name: profile.name,
          email: profile.email,
          matricula: profile.matricula,
          area: 'Docência',
          createdAt: profile.createdAt
        });
      } else {
        await setDoc(doc(db, 'alunos', uid), {
          id: uid,
          name: profile.name,
          email: profile.email,
          matricula: profile.matricula,
          turma: 'Geral',
          createdAt: profile.createdAt
        });
      }
    } else if (expectedRole && profile.role !== expectedRole) {
      await signOut(auth);
      return {
        success: false,
        error: `Esta conta Google está registrada como ${profile.role === 'aluno' ? 'Aluno' : 'Professor'}. Acesse selecionando "${profile.role === 'aluno' ? 'Sou Aluno' : 'Sou Professor'}".`
      };
    }

    return {
      success: true,
      user: profile
    };
  } catch (err: any) {
    console.error('Erro no Google Sign-In:', err);
    return {
      success: false,
      error: err.message || 'Erro ao realizar login com o Google.'
    };
  }
}

/**
 * Logout
 */
export async function firebaseSignOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Erro ao encerrar sessão:', err);
  }
}

/**
 * Retorna o perfil do usuário atualmente autenticado
 */
export async function firebaseGetCurrentUserProfile(): Promise<UserAccount | null> {
  const current = auth.currentUser;
  if (!current) return null;

  try {
    const userDocRef = doc(db, 'users', current.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserAccount;
    }
  } catch (err) {
    console.warn('Erro ao buscar perfil atual no Firestore:', err);
  }
  return null;
}

// ---------------------------------------------------------------------------
// ARMAZENAMENTO DE AULAS, TEXTOS, MP3 E PDFS PARTICIONADOS NO FIRESTORE
// ---------------------------------------------------------------------------

// Cache em memória para materiais reconstruídos (evita re-download desnecessário)
const materialBlobsCache = new Map<string, string>();

/**
 * Busca todas as aulas e atividades salvas no Firestore
 */
export async function firebaseFetchAulas(): Promise<{ success: boolean; data: Lesson[]; error?: string }> {
  try {
    const path = 'aulas';
    let snap;
    try {
      snap = await getDocs(collection(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }

    const aulas: Lesson[] = [];
    snap.forEach((d) => {
      const data = d.data() as Lesson;
      aulas.push({
        ...data,
        id: d.id,
        isFromFirebase: true
      });
    });

    return {
      success: true,
      data: aulas
    };
  } catch (err: any) {
    console.error('Erro ao buscar aulas:', err);
    return {
      success: false,
      data: [],
      error: err.message || 'Falha ao buscar aulas'
    };
  }
}

/**
 * Cria uma nova aula ou atividade
 */
export async function firebaseCreateAula(lesson: Lesson): Promise<{ success: boolean; error?: string }> {
  try {
    const aulaId = lesson.id || `aula-${Date.now()}`;
    const cleanLesson: Lesson = {
      ...lesson,
      id: aulaId,
      isFromFirebase: true
    };

    // Garante que campos de texto não fiquem undefined
    if (!cleanLesson.summary) cleanLesson.summary = '';
    if (!cleanLesson.fullContent) cleanLesson.fullContent = cleanLesson.summary || '';
    if (!cleanLesson.accessibleTranscript) cleanLesson.accessibleTranscript = '';
    if (!cleanLesson.tags) cleanLesson.tags = [cleanLesson.subject || 'Geral'];

    // Para evitar exceder o limite de 1MB do Firestore no documento da aula:
    // Se o materialUrl ou pdfFiles/mp3Lessons possuírem dataUrl longo (> 200KB), sanitiza com referência aos chunks
    const sanitizedPdfFiles = (cleanLesson.pdfFiles || []).map((pdf) => {
      if (pdf.dataUrl && pdf.dataUrl.startsWith('data:') && pdf.dataUrl.length > 200000) {
        return {
          ...pdf,
          dataUrl: `chunks://${cleanLesson.id}/pdf`,
          pathOrUrl: `chunks://${cleanLesson.id}/pdf`
        };
      }
      return pdf;
    });

    const sanitizedMp3Lessons = (cleanLesson.mp3Lessons || []).map((mp3) => {
      if (mp3.dataUrl && mp3.dataUrl.startsWith('data:') && mp3.dataUrl.length > 200000) {
        return {
          ...mp3,
          dataUrl: `chunks://${cleanLesson.id}/audio`
        };
      }
      return mp3;
    });

    const docData: any = { 
      ...cleanLesson,
      pdfFiles: sanitizedPdfFiles,
      mp3Lessons: sanitizedMp3Lessons
    };

    if (docData.materialUrl && docData.materialUrl.startsWith('data:') && docData.materialUrl.length > 200000) {
      docData.materialUrl = `chunks://${cleanLesson.id}/pdf`;
    }

    const docPath = `aulas/${aulaId}`;
    try {
      await setDoc(doc(db, 'aulas', aulaId), docData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar publicação:', err);
    return {
      success: false,
      error: err.message || 'Erro ao salvar publicação.'
    };
  }
}

/**
 * Atualiza uma aula existente
 */
export async function firebaseUpdateAula(lesson: Lesson): Promise<{ success: boolean; error?: string }> {
  try {
    const docPath = `aulas/${lesson.id}`;

    const sanitizedPdfFiles = (lesson.pdfFiles || []).map((pdf) => {
      if (pdf.dataUrl && pdf.dataUrl.startsWith('data:') && pdf.dataUrl.length > 200000) {
        return {
          ...pdf,
          dataUrl: `chunks://${lesson.id}/pdf`,
          pathOrUrl: `chunks://${lesson.id}/pdf`
        };
      }
      return pdf;
    });

    const sanitizedMp3Lessons = (lesson.mp3Lessons || []).map((mp3) => {
      if (mp3.dataUrl && mp3.dataUrl.startsWith('data:') && mp3.dataUrl.length > 200000) {
        return {
          ...mp3,
          dataUrl: `chunks://${lesson.id}/audio`
        };
      }
      return mp3;
    });

    const docData: any = {
      ...lesson,
      pdfFiles: sanitizedPdfFiles,
      mp3Lessons: sanitizedMp3Lessons,
      isFromFirebase: true
    };
    if (docData.materialUrl && docData.materialUrl.startsWith('data:') && docData.materialUrl.length > 200000) {
      docData.materialUrl = `chunks://${lesson.id}/pdf`;
    }

    try {
      await updateDoc(doc(db, 'aulas', lesson.id), docData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao atualizar aula:', err);
    return {
      success: false,
      error: err.message || 'Erro ao atualizar aula.'
    };
  }
}

/**
 * Deleta uma aula e seus chunks associados
 */
export async function firebaseDeleteAula(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docPath = `aulas/${id}`;
    
    // Tenta remover os chunks da subcoleção se houver
    try {
      const chunksSnap = await getDocs(collection(db, 'aulas', id, 'chunks'));
      const delPromises: Promise<void>[] = [];
      chunksSnap.forEach((c) => {
        delPromises.push(deleteDoc(doc(db, 'aulas', id, 'chunks', c.id)));
      });
      await Promise.all(delPromises);
    } catch (e) {
      console.warn('Aviso ao limpar chunks da aula:', e);
    }

    try {
      await deleteDoc(doc(db, 'aulas', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }

    materialBlobsCache.delete(id);
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir aula:', err);
    return {
      success: false,
      error: err.message || 'Erro ao excluir aula.'
    };
  }
}

/**
 * Upload seguro de materiais em PDF e Áudio MP3:
 * 1. Converte o arquivo para Data URL de imediato (sem travamento no navegador).
 * 2. Se o arquivo for maior que 300KB, particiona em fragmentos menores salvos
 *    na subcoleção 'aulas/{aulaId}/chunks/{prefix}_chunk_{index}' do Firestore com upload concorrente.
 * 3. Garante que PDF e Áudio MP3 da mesma aula não colidam e salva no cache em memória.
 */
export async function firebaseSaveAulaMaterialChunks(
  aulaId: string,
  file: File,
  folder: 'pdf' | 'audio',
  onProgress?: (progressPct: number) => void
): Promise<{ success: boolean; materialUrl?: string; error?: string }> {
  try {
    if (onProgress) onProgress(15);

    // Leitura rápida do arquivo em base64
    const dataUrl = await fileToDataUrl(file);
    if (onProgress) onProgress(35);

    const prefix = folder === 'audio' ? 'audio' : 'pdf';
    const referenceUrl = `chunks://${aulaId}/${prefix}`;

    // Salva no cache local para exibição e reprodução imediata
    materialBlobsCache.set(referenceUrl, dataUrl);
    materialBlobsCache.set(`${aulaId}/${prefix}`, dataUrl);
    materialBlobsCache.set(aulaId, dataUrl);

    // Se o arquivo for pequeno (< 200KB) e não colidir com o limite de 1MB, podemos retornar direto
    const CHUNK_CHAR_LIMIT = 300000; // ~225KB por chunk para segurança máxima
    if (dataUrl.length <= CHUNK_CHAR_LIMIT) {
      if (onProgress) onProgress(100);
      return {
        success: true,
        materialUrl: dataUrl
      };
    }

    // Para arquivos maiores (PDFs ou MP3s): particiona em sub-documentos com prefixo
    const totalChunks = Math.ceil(dataUrl.length / CHUNK_CHAR_LIMIT);
    const chunksCollRef = collection(db, 'aulas', aulaId, 'chunks');

    // Executa o envio em lotes de 4 chunks concorrentes para velocidade e estabilidade
    const BATCH_SIZE = 4;
    for (let b = 0; b < totalChunks; b += BATCH_SIZE) {
      const batchPromises: Promise<any>[] = [];
      const endBatch = Math.min(b + BATCH_SIZE, totalChunks);

      for (let i = b; i < endBatch; i++) {
        const start = i * CHUNK_CHAR_LIMIT;
        const end = Math.min(start + CHUNK_CHAR_LIMIT, dataUrl.length);
        const chunkData = dataUrl.substring(start, end);

        const chunkDocRef = doc(chunksCollRef, `${prefix}_chunk_${String(i).padStart(3, '0')}`);
        batchPromises.push(
          setDoc(chunkDocRef, {
            prefix,
            chunkIndex: i,
            totalChunks,
            data: chunkData,
            type: folder,
            fileName: file.name,
            mimeType: file.type || (folder === 'pdf' ? 'application/pdf' : 'audio/mpeg')
          })
        );
      }

      await Promise.all(batchPromises);

      if (onProgress) {
        const pct = Math.min(95, Math.round(35 + (endBatch / totalChunks) * 60));
        onProgress(pct);
      }
    }

    if (onProgress) onProgress(100);

    return {
      success: true,
      materialUrl: referenceUrl
    };
  } catch (err: any) {
    console.error('Erro ao particionar arquivo no Firestore:', err);
    // Em caso de falha de rede ao particionar, mantém o dataUrl localmente no cache
    try {
      const dataUrl = await fileToDataUrl(file);
      const prefix = folder === 'audio' ? 'audio' : 'pdf';
      const referenceUrl = `chunks://${aulaId}/${prefix}`;
      materialBlobsCache.set(referenceUrl, dataUrl);
      materialBlobsCache.set(aulaId, dataUrl);
      if (onProgress) onProgress(100);
      return {
        success: true,
        materialUrl: dataUrl
      };
    } catch (e: any) {
      return {
        success: false,
        error: err.message || 'Erro ao processar e salvar o arquivo.'
      };
    }
  }
}

/**
 * Reconstrói um arquivo particionado em chunks no Firestore e retorna uma URL utilizável (Blob URL ou DataURL)
 */
export async function firebaseLoadAulaMaterialUrl(
  aulaId: string, 
  rawUrl?: string | null
): Promise<string | null> {
  const searchKey = rawUrl || aulaId;
  if (!searchKey) return null;

  // 1. Se já temos em cache de memória
  if (materialBlobsCache.has(searchKey)) {
    return materialBlobsCache.get(searchKey)!;
  }
  if (materialBlobsCache.has(aulaId)) {
    return materialBlobsCache.get(aulaId)!;
  }

  // 2. Se é uma URL HTTP/HTTPS ou DataURL ou BlobURL normal
  if (
    searchKey.startsWith('http://') || 
    searchKey.startsWith('https://') || 
    searchKey.startsWith('data:') ||
    searchKey.startsWith('blob:')
  ) {
    materialBlobsCache.set(searchKey, searchKey);
    return searchKey;
  }

  // 3. Extrai o ID limpo da aula e o prefixo (pdf ou audio)
  let cleanId = aulaId.replace('chunks://', '').trim();
  let targetPrefix: string | null = null;

  if (cleanId.includes('/')) {
    const parts = cleanId.split('/');
    cleanId = parts[0];
    targetPrefix = parts[1];
  } else if (rawUrl && rawUrl.includes('/')) {
    const parts = rawUrl.replace('chunks://', '').split('/');
    if (parts.length > 1) {
      cleanId = parts[0];
      targetPrefix = parts[1];
    }
  }

  // 4. Busca os fragmentos no Firestore
  try {
    const chunksSnap = await getDocs(collection(db, 'aulas', cleanId, 'chunks'));
    if (chunksSnap.empty) {
      console.warn('Nenhum fragmento encontrado para a aula:', cleanId);
      return null;
    }

    const chunkItems: { chunkIndex: number; data: string; mimeType?: string }[] = [];
    chunksSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const docId = docSnap.id;

      if (targetPrefix) {
        if (d.prefix === targetPrefix || docId.startsWith(`${targetPrefix}_`)) {
          chunkItems.push({
            chunkIndex: d.chunkIndex ?? 0,
            data: d.data || '',
            mimeType: d.mimeType
          });
        }
      } else {
        chunkItems.push({
          chunkIndex: d.chunkIndex ?? 0,
          data: d.data || '',
          mimeType: d.mimeType
        });
      }
    });

    // Se filtrou por prefix e não achou, mas há chunks (retrocompatibilidade)
    if (chunkItems.length === 0 && !chunksSnap.empty) {
      chunksSnap.forEach((docSnap) => {
        const d = docSnap.data();
        chunkItems.push({
          chunkIndex: d.chunkIndex ?? 0,
          data: d.data || '',
          mimeType: d.mimeType
        });
      });
    }

    chunkItems.sort((a, b) => a.chunkIndex - b.chunkIndex);
    const fullDataUrl = chunkItems.map((c) => c.data).join('');

    if (!fullDataUrl) {
      return null;
    }

    // Tenta converter em Blob URL nativo para navegação e streaming de áudio sem limites
    try {
      const blob = dataUrlToBlob(fullDataUrl);
      const blobUrl = URL.createObjectURL(blob);
      materialBlobsCache.set(searchKey, blobUrl);
      materialBlobsCache.set(cleanId, blobUrl);
      return blobUrl;
    } catch {
      materialBlobsCache.set(searchKey, fullDataUrl);
      return fullDataUrl;
    }
  } catch (err) {
    console.error('Erro ao reconstruir material particionado:', err);
    return null;
  }
}

/**
 * Abre ou baixa um material salvo no Firebase com segurança total contra falhas de atob
 */
export async function firebaseOpenOrDownloadMaterial(
  pathOrUrl: string, 
  filename: string, 
  mode: 'open' | 'download' = 'open',
  aulaId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!pathOrUrl) {
    return { success: false, error: 'URL do arquivo não fornecida.' };
  }

  try {
    let resolvedUrl = pathOrUrl;

    // Se é uma referência a chunks do Firestore, reconstrói o arquivo
    if (pathOrUrl.startsWith('chunks://') || (aulaId && pathOrUrl.includes(aulaId))) {
      const extractedId = aulaId || pathOrUrl.replace('chunks://', '');
      const reconstructed = await firebaseLoadAulaMaterialUrl(extractedId, pathOrUrl);
      if (reconstructed) {
        resolvedUrl = reconstructed;
      } else {
        return { 
          success: false, 
          error: 'Material ainda não sincronizado ou fragmentos não encontrados no banco de dados.' 
        };
      }
    }

    if (mode === 'open') {
      if (resolvedUrl.startsWith('data:')) {
        const blob = dataUrlToBlob(resolvedUrl);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
      }
      return { success: true };
    }

    // Modo Download
    let downloadHref = resolvedUrl;
    let tempBlobUrl: string | null = null;

    if (resolvedUrl.startsWith('data:')) {
      const blob = dataUrlToBlob(resolvedUrl);
      tempBlobUrl = URL.createObjectURL(blob);
      downloadHref = tempBlobUrl;
    }

    const a = document.createElement('a');
    a.href = downloadHref;
    a.download = filename || 'material';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (tempBlobUrl) {
      setTimeout(() => URL.revokeObjectURL(tempBlobUrl!), 10000);
    }
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao abrir/baixar material:', err);
    return { success: false, error: err.message || 'Erro ao processar o download do arquivo.' };
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Converte dataUrl base64 em Blob com tratamento total de erros,
 * limpeza de caracteres de espaço, correção de padding '=' e fallbacks resilientes.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  if (!dataUrl) {
    return new Blob([], { type: 'application/octet-stream' });
  }

  // Se já for uma URL HTTP ou Blob URL
  if (dataUrl.startsWith('blob:') || dataUrl.startsWith('http:') || dataUrl.startsWith('https:')) {
    return new Blob([], { type: 'application/octet-stream' });
  }

  let mimeType = 'application/octet-stream';
  let base64Part = dataUrl;

  if (dataUrl.includes(',')) {
    const parts = dataUrl.split(',');
    const header = parts[0];
    const mimeMatch = header.match(/:(.*?);/);
    if (mimeMatch && mimeMatch[1]) {
      mimeType = mimeMatch[1];
    }
    base64Part = parts[1] || '';
  }

  // Remove quebras de linha e espaços em branco que quebram o atob nativo
  base64Part = base64Part.trim().replace(/\s/g, '');

  // Ajusta preenchimento de Base64 se estiver incompleto (múltiplo de 4)
  const remainder = base64Part.length % 4;
  if (remainder === 2) {
    base64Part += '==';
  } else if (remainder === 3) {
    base64Part += '=';
  } else if (remainder === 1) {
    // Trunca caractere solto inválido
    base64Part = base64Part.slice(0, -1);
  }

  try {
    const binary = window.atob(base64Part);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  } catch (err) {
    console.warn('Falha no window.atob, gerando fallback de dados:', err);
    try {
      const decoded = decodeURIComponent(escape(base64Part));
      return new Blob([decoded], { type: mimeType });
    } catch {
      return new Blob([base64Part], { type: mimeType });
    }
  }
}

export function isMaterialFileAllowed(file: File): { valid: boolean; reason?: string } {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.mp3', '.wav', '.m4a'];
  const name = file.name.toLowerCase();
  const isAllowed = allowedExtensions.some(ext => name.endsWith(ext));
  if (!isAllowed) {
    return {
      valid: false,
      reason: `Formato não suportado. Envie arquivos PDF, Word, PowerPoint, Imagens ou Áudio MP3.`
    };
  }
  if (file.size > 25 * 1024 * 1024) {
    return {
      valid: false,
      reason: 'O arquivo excede o limite máximo permitido de 25MB.'
    };
  }
  return { valid: true };
}

export type MaterialCategory = 'pdf' | 'doc' | 'presentation' | 'image' | 'audio' | 'word' | 'powerpoint' | 'other';

export function getMaterialCategory(fileName: string): MaterialCategory {
  const name = fileName.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.txt')) return 'word';
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'powerpoint';
  if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp')) return 'image';
  if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.m4a')) return 'audio';
  return 'other';
}
