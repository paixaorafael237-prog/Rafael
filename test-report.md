# Relatório de Testes — Pinguim Aventura 3D (PR #1)

**Resumo:** executei o plano completo (T1–T7) contra a build local servida em `http://localhost:8080`, depois do fix `4193462` de controles. Os 7 testes passaram.

**Escalações:**
- Durante o T4 inicial encontrei um bug nos controles: `W` movia o pinguim em `-z`, longe da bandeira. Corrigi em `4193462` (`fix(controls): W moves forward (+z)`) e o T4 passou na execução final.
- Ambiente de CI/Chrome com WebGL precisou de `--use-gl=swiftshader --enable-unsafe-swiftshader` para o renderer Three.js inicializar (não afeta usuários reais com Chrome normal).

## Resultado por teste

| ID | Caso | Resultado |
|----|------|-----------|
| T1 | Menu principal carrega com título e 4 botões | ✅ pass |
| T2 | Selecionar Nível mostra 7 níveis, 6 travados | ✅ pass |
| T3 | Áudio procedural (sem fetch de arquivos `.mp3/.ogg/.wav`) | ✅ pass |
| T4 | Jogar Nível 1 do menu até a bandeira | ✅ pass (com o fix) |
| T5 | Pausa (Esc) abre overlay com 3 botões | ✅ pass |
| T6 | Nível 2 desbloqueia após terminar Nível 1 | ✅ pass |
| T7 | Nível 7 (boss) carrega com chefão visível | ✅ pass |

## Evidência

| T1 — Menu | T2 — Nível 1 desbloqueado, 2–7 travados |
|---|---|
| ![T1 menu](https://app.devin.ai/attachments/d61cd16c-908a-4b41-bfe9-51be3b9d7bea/t1-menu.png) | ![T2 level select](https://app.devin.ai/attachments/cd972dba-879a-492c-8cb4-d88449602769/t2-level-select.png) |

| T4 — Intro do Nível 1 | T4 — Nível Concluído (após o fix do W) |
|---|---|
| ![T4 intro](https://app.devin.ai/attachments/f4d03c61-ec81-491e-8e5a-145c8768d013/t4-level-intro.png) | ![T4 complete](https://app.devin.ai/attachments/8d357395-876f-4257-a042-f27b9a4aff86/t4-level-complete.png) |

| T5 — Pausa (Esc) | T6 — Nível 2 destravado |
|---|---|
| ![T5 pause](https://app.devin.ai/attachments/5d905e19-c02a-4d6f-b924-4dbbbcb55b80/t5-pause.png) | ![T6 l2 unlocked](https://app.devin.ai/attachments/b9432a3b-469d-436b-a1c2-7ab16e1da4df/t6-l2-unlocked.png) |

| T7 — Boss Nível 7 |
|---|
| ![T7 boss](https://app.devin.ai/attachments/94ce5b59-b48f-43d7-b4cd-3cb98a46b829/t7-boss-level.png) |

## Asserções verificadas (DOM/CDP)

- **T1**: `#menu` visível; `#menu .title` = `"Pinguim Aventura 3D"`; botões = `["Jogar","Selecionar Nível","Opções","Créditos"]`.
- **T2**: `#level-grid .level-btn.length === 7`, `.locked.length === 6`, L1 destravado, L2 travado.
- **T3**: `performance.getEntriesByType('resource').filter(/\.(mp3|ogg|wav|m4a)/).length === 0` (áudio é 100% procedural via Web Audio API). Ícone de áudio na aba após o primeiro clique confirma `AudioContext` em `running`.
- **T4**: depois de focar o canvas e segurar `W`, `#hud-fish` foi de `0` para `1`, `#hud-time` de `~0s` para `~129.8s`, e `#level-complete` ficou visível ao tocar a bandeira. Texto: `"Nível Concluído! 🎉"`.
- **T5**: `Esc` durante `state==='playing'` ⇒ `#pause` visível com `["Retomar","Reiniciar Nível","Voltar ao Menu"]`.
- **T6**: após T4, `#level-grid .level-btn[1]` perdeu a classe `locked` (locked total = 5).
- **T7**: `localStorage.setItem('penguin3d_unlocked','7')` + reload + clique L7 ⇒ intro `"Nível 7 — Covil do Rei Polar"`, HUD `Nível 7/7`, arena roxa renderizada com PolarKing.
