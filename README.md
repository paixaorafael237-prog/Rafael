# Pinguim Aventura 3D — 7 Níveis

Um jogo 3D criado com [Three.js](https://threejs.org/) onde você controla um
pinguim que precisa atravessar 7 mundos cheios de inimigos e obstáculos.

![Three.js](https://img.shields.io/badge/three.js-0.160-111?logo=three.js)
![Vanilla JS](https://img.shields.io/badge/vanilla-ES%20modules-yellow)
![No build step](https://img.shields.io/badge/build-none-green)

## Jogar

O jogo é 100% estático — basta abrir `index.html` em um navegador moderno,
ou servir o diretório com qualquer HTTP server:

```bash
# Python 3 (mais fácil)
python3 -m http.server 8080

# Node
npx --yes serve .
```

Depois abra <http://localhost:8080>.

> Nota: os módulos ES do navegador exigem que o jogo seja servido por HTTP;
> não funciona abrindo o arquivo `index.html` direto via `file://`.

## Controles

| Ação                | Tecla                  |
| ------------------- | ---------------------- |
| Mover               | **WASD** ou **setas**  |
| Pular               | **Espaço**             |
| Correr              | **Shift**              |
| Pausar              | **Esc**                |
| Tela cheia          | Duplo clique no jogo   |

## Níveis

1. **Planícies Nevadas** — tutorial com bonecos de neve.
2. **Cavernas de Gelo** — chão escorregadio e espinhos.
3. **Lago Congelado** — plataformas flutuantes sobre o vazio.
4. **Passo da Montanha** — bolas de neve rolantes.
5. **Arquipélago Polar** — inimigos variados em uma ilha grande.
6. **Abismo Gelado** — plataformas móveis sobre um grande abismo.
7. **Covil do Rei Polar** — batalha final contra o chefão.

Colete peixes 🐟 no caminho e pule sobre os inimigos estompáveis
(como os bonecos de neve e o Rei Polar) para eliminá-los.

## Estrutura

```
index.html          → HTML + overlays de menu
styles.css          → estilos da interface
src/
  main.js           → entrada: conecta UI, áudio, input e jogo
  game.js           → loop de jogo, cena, câmera, colisões
  penguin.js        → personagem controlável
  levels.js         → definições dos 7 níveis
  enemies.js        → bonecos de neve, duendes, morcegos, bolas, chefão
  obstacles.js      → espinhos, gelo, plataformas móveis, bandeira
  audio.js          → música e efeitos sonoros procedurais (Web Audio API)
  ui.js             → gerenciamento de menus e HUD
  input.js          → teclado
```

## Áudio

Todo o áudio (música e efeitos sonoros) é gerado em tempo real usando a
Web Audio API — o repositório não contém arquivos de áudio. Isso mantém o
build pequeno e garante que nada depende de redes ou assets externos.

## Deploy

O projeto é compatível com GitHub Pages — basta ativar Pages apontando para
a branch `main`. O workflow em `.github/workflows/pages.yml` publica
automaticamente a cada push na `main`.

## Licença

MIT.
