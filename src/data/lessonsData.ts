import { Lesson } from '../types';
import { generatePdfDataUrl } from '../utils/pdfGenerator';
import { generateSampleAudioDataUrl } from '../utils/audioGenerator';

export const INITIAL_LESSONS: Lesson[] = [
  {
    id: 'aula-1',
    title: 'Fundamentos de Informática & Inclusão Digital no Laboratório',
    subject: 'Informática',
    teacherName: 'Prof. Marcos Silva',
    date: '2026-10-05',
    summary: 'Conceitos essenciais de computadores, periféricos, atalhos de acessibilidade do teclado e navegação inclusiva para alunos surdos e com deficiência.',
    fullContent: `Bem-vindos à nossa aula de Informática Acessível!

Neste módulo, revisamos a estrutura fundamental do computador e como configurar seu ambiente de estudos com total acessibilidade:
1. Periféricos de Entrada: Teclado, mouse e microfone para legendagem instantânea.
2. Atalhos Essenciais no Windows:
   - Tecla Windows + U: Abre as configurações de Acessibilidade.
   - Tecla Windows + Ctrl + L: Ativa a Legenda em Tempo Real (Live Captions) nativa.
   - Tecla Windows + + (mais): Abre a Lente de Aumento.
3. Comunicação em Rede Local:
   - Compartilhamento de arquivos no laboratório via navegador e IP do servidor local.
   - Utilização do aplicativo Ponte para avisos visuais e transcrição.

Dica de Estudo: Pratique os atalhos em seu computador e confira a apostila completa em PDF anexada abaixo!`,
    accessibleTranscript: 'Resumo visual: Computador é formado por hardware (partes físicas) e software (programas). Use atalho Win+U para abrir acessibilidade. O aplicativo Ponte ajuda você a conversar e estudar sem barreiras de comunicação.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    mp3Lessons: [
      {
        id: 'mp3-1',
        title: 'Videoaula em Áudio MP3: Introdução ao Hardware e Atalhos de Acessibilidade',
        fileName: 'videoaula_informatica_mod1.mp3',
        dataUrl: generateSampleAudioDataUrl('Informática Módulo 1', 6),
        durationFormatted: '05:30',
        fileSizeFormatted: '4.8 MB',
        uploadedAt: '05/10/2026',
        transcript: 'Olá alunos! Nesta videoaula explicamos o hardware básico do computador e como ativar legendas instantâneas pressionando as teclas Windows mais Ctrl mais L. Você pode clicar no Boneco do VLibras para traduzir esta explicação para a Língua Brasileira de Sinais.',
        librasInstructions: 'Sinais principais desta aula: COMPUTADOR, TECLADO, TELA, ACESSIBILIDADE, LEGENDA.'
      }
    ],
    pdfFiles: [
      {
        id: 'pdf-1',
        name: 'Apostila_Informatica_Acessivel_Mod1.pdf',
        sizeFormatted: '185 KB',
        dataUrl: generatePdfDataUrl(
          'Apostila: Fundamentos de Informatica e Inclusao',
          'Prof. Marcos Silva',
          'Informatica',
          [
            'Apostila Didatica - Modulo 1: Computacao e Acessibilidade',
            '1. Introducao ao Hardware e Perifericos de Entrada e Saida',
            '2. Atalhos de Acessibilidade no Sistema Operacional',
            '   - Win + U: Painel de Acessibilidade',
            '   - Win + Ctrl + L: Legendas ao Vivo (Live Captions)',
            '   - Win + +: Lupa e Ampliacao de tela',
            '3. Recursos Visuais para Alunos Surdos em Sala de Aula',
            '4. Exercicio Pratico: Configuracao da area de trabalho',
            'Material preparado para o Projeto Integrador Ponte Comunica.'
          ]
        ),
        uploadedAt: '05/10/2026',
        pageCount: 1,
        description: 'Apostila com diagrama de periféricos e atalhos rápidos de acessibilidade.'
      }
    ],
    isCompleted: false,
    studentNotes: '',
    tags: ['Informática', 'Hardware', 'Acessibilidade', 'Atalhos']
  },
  {
    id: 'aula-2',
    title: 'Libras Acadêmica: Parâmetros e Sinais do Ambiente Escolar',
    subject: 'Libras',
    teacherName: 'Profa. Camila Duarte',
    date: '2026-10-06',
    summary: 'Aprofundamento nos 5 parâmetros da Língua Brasileira de Sinais: Configuração de Mão, Ponto de Articulação, Movimento, Orientação e Expressão Facial.',
    fullContent: `Olá a todos os alunos e alunas!

Na aula de hoje, estudamos como a Libras é uma língua viva, com gramática própria e estrutura espaço-visual rica:

1. Os 5 Parâmetros da Libras:
   - CM (Configuração de Mão): O formato exato que a mão assume ao sinalizar.
   - PA (Ponto de Articulação): O local do corpo ou no espaço neutro onde o sinal é realizado.
   - M (Movimento): O deslocamento, direção e velocidade das mãos.
   - O (Orientação): A direção para onde a palma da mão está voltada.
   - ENM (Expressão Não-Manual): Expressões faciais e corporais essenciais para diferenciar perguntas, exclamações e intensidade.

2. Vocabulário da Sala de Aula:
   - "Professor", "Aluno", "Apostila", "Prova", "Dúvida", "Computador", "Intervalo".

Utilize o Boneco 3D do Governo Federal (VLibras) na aba lateral para ver a reprodução dinâmica de cada sinal em 3D!`,
    accessibleTranscript: 'Guia de Libras: Libras tem 5 regras fundamentais (CM, PA, M, O e Expressão). Veja os sinais de Escola e Professor praticando com o avatar 3D do governo no topo do app.',
    mp3Lessons: [
      {
        id: 'mp3-2',
        title: 'Videoaula em Áudio MP3: Pronúncia e Parâmetros dos Sinais Escolares',
        fileName: 'videoaula_libras_parametros.mp3',
        dataUrl: generateSampleAudioDataUrl('Libras Parâmetros', 7),
        durationFormatted: '08:15',
        fileSizeFormatted: '7.2 MB',
        uploadedAt: '06/10/2026',
        transcript: 'Bem-vindos à aula prática de Libras. Lembrem-se que a Configuração de Mão e a Expressão Facial são fundamentais para o sentido correto de cada frase. Ative o Boneco do VLibras agora para ver estes sinais em movimento 3D.',
        librasInstructions: 'Sinais fundamentais: PROFESSOR, ESTUDAR, LIBRAS, MAOS, ESCOLA.'
      }
    ],
    pdfFiles: [
      {
        id: 'pdf-2',
        name: 'Guia_Libras_Parametros_Escolares.pdf',
        sizeFormatted: '210 KB',
        dataUrl: generatePdfDataUrl(
          'Guia Pratico: Parametros da Libras na Escola',
          'Profa. Camila Duarte',
          'Libras',
          [
            'Guia de Estudo - Lingua Brasileira de Sinais no Ensino',
            '1. Os Cinco Parametros Fonologicos da Libras',
            '   a) Configuracao de Mao (CM)',
            '   b) Ponto de Articulacao (PA)',
            '   c) Movimento (M)',
            '   d) Orientacao da Palma (O)',
            '   e) Expressao Facial e Corporal (ENM)',
            '2. Glossario de Termos Escolares em Libras',
            '3. Dicas de Comunicacao Inclusiva no Cotidiano',
            '4. Pratica Interativa com o Avatar 3D VLibras',
            'Bons estudos! Duvidas podem ser enviadas no painel da aula.'
          ]
        ),
        uploadedAt: '06/10/2026',
        pageCount: 1,
        description: 'Tabela comparativa dos 5 parâmetros fonológicos da Libras com exemplos escolares.'
      }
    ],
    isCompleted: false,
    studentNotes: '',
    tags: ['Libras', 'Parâmetros', 'Educação Bilíngue', 'Gramática']
  },
  {
    id: 'aula-3',
    title: 'Comunicação Escrita e Interpretação Textual no Cotidiano',
    subject: 'Língua Portuguesa',
    teacherName: 'Prof. André Lucas',
    date: '2026-10-07',
    summary: 'Leitura assertiva, coesão, conectivos e redação de mensagens claras para e-mails institucionais e ambientes profissionais.',
    fullContent: `Prezados estudantes,

Uma comunicação escrita clara e objetiva abre portas em entrevistas, no trabalho em equipe e nos estudos:

1. Estrutura da Mensagem Eficaz:
   - Assunto Direto e Conciso.
   - Saudação inicial educada.
   - Desenvolvimento em parágrafos curtos.
   - Ação solicitada ou encerramento com agradecimento.

2. Recursos de Apoio no Aplicativo:
   - Use a aba "Frases Rápidas" para mensagens habituais.
   - Use "Falar por Mim" para sintetizar em áudio o texto que você digitou.
   - O material em PDF inclui exercícios práticos com gabarito comentado.`,
    accessibleTranscript: 'Mensagem boa precisa ser direta: 1) Assunto claro, 2) Texto curto, 3) Conclusão. Exercícios práticos no PDF!',
    mp3Lessons: [
      {
        id: 'mp3-3',
        title: 'Videoaula em Áudio MP3: Redação Objetiva e Interpretação de Texto',
        fileName: 'videoaula_portugues_redacao.mp3',
        dataUrl: generateSampleAudioDataUrl('Português Redação', 6),
        durationFormatted: '06:40',
        fileSizeFormatted: '5.5 MB',
        uploadedAt: '07/10/2026',
        transcript: 'Neste áudio revisamos técnicas para escrever mensagens rápidas e objetivas no ambiente de trabalho e sala de aula. Ouça com atenção e ative a tradução em Libras com o Boneco do VLibras.',
        librasInstructions: 'Sinais em destaque: ESCREVER, LER, MENSAGEM, TEXTO, APRENDER.'
      }
    ],
    pdfFiles: [
      {
        id: 'pdf-3',
        name: 'Manual_Comunicacao_Escrita_Pratica.pdf',
        sizeFormatted: '195 KB',
        dataUrl: generatePdfDataUrl(
          'Manual de Comunicacao Escrita e Redacao Pratica',
          'Prof. Andre Lucas',
          'Lingua Portuguesa',
          [
            'Manual Pratico - Redacao Assertiva e Comunicacao Inclusiva',
            '1. Principios da Clareza e Concisao',
            '2. Redigindo Mensagens Formais e Corporativas',
            '3. Pontuacao e Conectivos para Facilitar a Compreensao',
            '4. Exemplo Comparativo: Antes e Depois da Revisao',
            '5. Exercicios de Fixacao com Gabarito Comentado',
            'Material complementar para estudo autonomo e em sala.'
          ]
        ),
        uploadedAt: '07/10/2026',
        pageCount: 1,
        description: 'Exemplos comentados de mensagens e exercícios práticos de interpretação.'
      }
    ],
    isCompleted: false,
    studentNotes: '',
    tags: ['Português', 'Redação', 'Comunicação', 'Exercícios']
  }
];
