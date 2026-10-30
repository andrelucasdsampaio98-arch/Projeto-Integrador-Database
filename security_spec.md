# Security Specification: Ponte Comunica Acessível (Updated)

## 1. Data Invariants
- `users`: Every user document at `/users/{userId}` has document ID equal to `request.auth.uid`.
- `professores`: Only authenticated teachers can have a document at `/professores/{userId}`.
- `alunos`: Only authenticated students can have a document at `/alunos/{userId}`.
- Cross-role prevention: An account registered in `alunos` cannot authenticate or write as teacher in `professores`.
- `aulas`: Pedagogical publications viewable by authenticated users, created/updated by teachers.
- `aulas/{aulaId}/chunks/{chunkId}`: Binary fragments of PDFs and MP3s linked to the parent aula document.

## 2. Dirty Dozen Invariants
1. Unauthenticated write to `/users/{userId}` -> REJECT.
2. Unauthenticated write to `/professores/{userId}` -> REJECT.
3. Unauthenticated write to `/alunos/{userId}` -> REJECT.
4. User trying to write to someone else's profile -> REJECT.
5. Injected invalid role -> REJECT.
6. Unauthenticated write to `/aulas/{aulaId}` -> REJECT.
7. Aula omitting required `title` -> REJECT.
8. Aula with invalid `tipo` -> REJECT.
9. Write to chunks without authentication -> REJECT.
10. Unauthenticated reads -> REJECT.
11. Arbitrary collection write (`/secrets`) -> REJECT.
12. Oversized fields exceeding boundary limits -> REJECT.
