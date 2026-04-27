# Plano de Testes — Pinguim Aventura 3D (PR #1)

Jogo 3D estático em Three.js com 7 níveis, menu, música e SFX procedurais.
Servido localmente em `http://localhost:8080`.

## O que testar

Foco: provar que o **fluxo primário de jogabilidade** funciona ponta-a-ponta
em pelo menos um nível representativo, e que os sistemas auxiliares
(menu, HUD, áudio, pausa) respondem corretamente.

## Casos de teste (com critérios de pass/fail concretos)

### T1 — Carregamento inicial & menu principal
- Ação: abrir `http://localhost:8080/index.html` em Chrome maximizado.
- Pass: Canvas renderiza fundo azul céu (gradiente) E overlay "Pinguim
  Aventura 3D" aparece com botões "Jogar", "Selecionar Nível", "Opções",
  "Créditos" visíveis.
- Fail: tela branca / erro no console / overlay ausente.
- Evidência: screenshot inicial, checagem de `document.querySelector('#menu').classList.contains('hidden')` deve ser **false**.
- Evidência extra (console): `document.querySelectorAll('.btn').length` deve ser **≥ 9**.

### T2 — Seleção de Nível exibe exatamente 7 níveis, com 2..7 travados
- Ação: clicar "Selecionar Nível".
- Pass: 7 botões numerados 1..7 aparecem. Apenas o nível 1 deve estar clicável (classe `level-btn` sem `locked`); níveis 2..7 devem ter a classe `locked`.
- Fail: número diferente de 7, ou nível 1 travado, ou nível 2 destravado.
- Evidência: `document.querySelectorAll('#level-grid .level-btn').length` = **7** e `document.querySelectorAll('#level-grid .level-btn.locked').length` = **6**.

### T3 — Áudio é retomado após primeiro gesto do usuário (política de autoplay)
- Ação: antes do primeiro clique, `window.__audioTest = null`. Clicar em "Voltar" no Selecionar Nível.
- Pass: dentro de 1s, a música começa a tocar. Verificar via console que `AudioContext.state === 'running'` no `audio.ctx`.
- Fail: AudioContext permanece "suspended" após clique.
- Evidência: inspeção via `document` (não há acesso direto, mas posso olhar o estado do AudioManager via `__game` se exposto; se não houver, verifico pela resposta perceptível — música audível). Também posso checar `performance.getEntriesByType` para confirmar que não houve nenhum pedido de rede de áudio (prova que é procedural).

### T4 — Fluxo primário: jogar Nível 1 do menu até a bandeira
- Ação: "Jogar" → clicar "Iniciar" no overlay de intro do Nível 1.
  - Mover o pinguim para frente (`W`) de forma contínua por ~7s, pulando
    (`Espaço`) quando se aproximar de bonecos de neve para estompá-los.
- Pass:
  - HUD mostra `Nível 1/7`, `Vidas ♥♥♥`, `Peixes 0` no início.
  - Após andar para frente, o valor `hud-time` aumenta (>0.5s) e `hud-fish` incrementa ao menos uma vez ao encostar num peixe.
  - Ao encostar na bandeira em z≈26, o overlay `#level-complete` aparece com texto "Nível Concluído!" e o HUD esconde.
- Fail: pinguim não se mexe, HUD não atualiza, level não completa ao tocar a bandeira, ou overlay de completude não aparece.
- Evidência: screenshots do gameplay + overlay de completude; valor do contador de tempo > 0.

### T5 — Pausa (Esc) funciona durante a partida
- Ação: após iniciar o Nível 1, apertar `Esc`.
- Pass: overlay `#pause` aparece com botões "Retomar", "Reiniciar Nível", "Voltar ao Menu".
- Fail: `Esc` ignorado, ou jogo continua rodando por baixo (penguim visivelmente se movendo) — mas visualmente, o overlay deve cobrir.
- Evidência: `document.querySelector('#pause').classList.contains('hidden')` deve ser **false**.

### T6 — Nível 2 é desbloqueado após concluir o Nível 1
- Ação: após T4 (nível concluído), voltar ao menu e abrir Selecionar Nível.
- Pass: botão do Nível 2 **não** deve ter a classe `locked`.
- Fail: nível 2 permanece `locked`.
- Evidência: `document.querySelectorAll('#level-grid .level-btn')[1].classList.contains('locked')` deve ser **false**.

### T7 — Regressão/amostragem: iniciar Nível 7 (boss) carrega sem erro
- Ação: via console, forçar desbloqueio (`localStorage.setItem('penguin3d_unlocked','7')` + reload) e clicar no botão do Nível 7.
- Pass: overlay "Nível 7 — Covil do Rei Polar" aparece; ao clicar "Iniciar" o chefão (PolarKing — figura grande com coroa) é visível no centro da arena; HUD mostra `Nível 7/7`.
- Fail: erro no console, chefão ausente, ou nível crasha.
- Evidência: screenshot do boss.

## Negativos adversariais (o plano distingue correto vs. quebrado?)

- Se a colisão de bandeira estivesse quebrada, T4 não terminaria e `#level-complete` permaneceria oculto → observável.
- Se o `localStorage` de progresso estivesse quebrado, T6 mostraria o Nível 2 ainda `locked`.
- Se o input estivesse quebrado, o `hud-time` e a posição do pinguim na câmera não mudariam.
- Se o áudio procedural estivesse quebrado, nenhum som seria ouvido apesar do `AudioContext.state === 'running'`.
- Se o Nível 7 não tivesse sido construído corretamente, nenhum modelo de boss apareceria na arena (teste T7 capta).

## Gravação
Vou gravar a sessão do Chrome com a janela maximizada, anotando cada teste
com `record_annotate`. Fica uma única gravação contínua.
