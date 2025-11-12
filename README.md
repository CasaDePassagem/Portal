# Portal Casa de Apoio

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=fff)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=fff)
![Tailwind](https://img.shields.io/badge/Tailwind-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=fff)
![Framer Motion](https://img.shields.io/badge/Framer%20Motion-0055FF?style=for-the-badge&logo=framer&logoColor=fff)
![Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=fff)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-0F9D58?style=for-the-badge&logo=googlesheets&logoColor=fff)

> Plataforma web que entrega mini cursos com acompanhamento de progresso, portal administrativo e um gerador de currículo visual com exportação em PDF. O backend roda em Google Apps Script sobre planilhas do Google Drive, permitindo operação sem infraestrutura dedicada.

## Índice

1. [Visão geral](#visão-geral)
2. [Screenshots](#screenshots)
3. [Stack principal](#stack-principal)
4. [Arquitetura](#arquitetura)
5. [Funcionalidades](#funcionalidades)
6. [Fluxos críticos e segurança](#fluxos-críticos-e-segurança)
7. [Execução local](#execução-local)
8. [Configuração do backend (Apps Script)](#configuração-do-backend-apps-script)
9. [Variáveis de ambiente do front-end](#variáveis-de-ambiente-do-front-end)
10. [Estrutura de pastas](#estrutura-de-pastas)
11. [Scripts npm](#scripts-npm)
12. [Convenções e tooling](#convenções-e-tooling)
13. [Roadmap](#roadmap)
14. [Contato](#contato)

## Visão geral

- SPA em React + TypeScript com roteamento público (landing, tutorial, cursos, gerador de currículo) e rotas protegidas para o painel administrativo.
- Dados mestres e autenticação ficam em uma planilha do Google. O script `google-apps-script/Code.gs` expõe uma API REST segura com schema versionado, migração automática de cabeçalhos, rate limiting, nonce e reCAPTCHA opcional.
- O front-end mantém um store em memória (`src/lib/memoryStore.ts`) e sincroniza tudo via `src/lib/remoteSync.ts`, oferecendo experiência offline-first para os dados públicos e cache local do progresso individual.
- O player de aulas (`YouTube Iframe API`) registra progresso com salvamento incremental (cada 10s) e reconecta automaticamente na próxima sessão.

## Screenshots

<p align="center">
  <img src="./public/screenshots/home.png" alt="Home - Portal Casa de Apoio" width="280" />
  <img src="./public/screenshots/tutorial.png" alt="Dicas de currículo" width="280" />
  <img src="./public/screenshots/preview.png" alt="Gerador de currículo com preview" width="280" />
</p>

## Stack principal

| Camada | Principais ferramentas |
|--------|------------------------|
| Front-end | React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion |
| UI/UX | `@hello-pangea/dnd` para drag & drop, lucide-react para ícones, React Datepicker e date-fns |
| PDF | html2canvas + jsPDF com renderização fiel do preview |
| Estado & dados | Context API (`AuthContext`, `LearnerContext`), store em memória, caches em `localStorage` |
| Backend | Google Apps Script + Sheets (`SCHEMA`, validações, LockService) |
| Segurança | Sessões opacas com Script Properties, senha HMAC-SHA256 com salt, anti-bot (captcha + desafio aritmético), throttling via CacheService |

## Arquitetura

### Front-end

- `src/App.tsx` organiza rotas via React Router (landing pages e rotas `/dashboard` protegidas por `ProtectedRoute`).
- Contextos principais:
  - `AuthContext` (`src/context/AuthContext.tsx`): autenticação baseada na API do Apps Script, com desafio extra após repetidas tentativas.
  - `LearnerContext` (`src/context/LearnerContext.tsx`): controla participante ativo, progresso e fluxo de atualização em tempo real.
- `src/lib/remoteStore.ts` encapsula a comunicação HTTP com o Apps Script, gerenciando sessão (`sessionToken`), nonce e chave secreta (`VITE_REMOTE_API_SECRET`).
- `src/lib/remoteSync.ts` baixa snapshots completos (`dump`), normaliza tipos, importa para o store em memória e usa `cache.ts` para guardar tópicos/ conteúdos/ aulas de forma pública.
- `src/lib/progress.ts` gerencia toda a lógica de participantes: criação de códigos, salvamento incremental de progresso, merge com dados do servidor e cache local (`progressCache.ts`).
- `src/lib/customNotebook.ts` implementa o sistema de fichário personalizado com listeners em tempo real para campos, páginas e valores, suportando reordenação, arquivamento e restauração.
- `DashboardPage` usa drag & drop para ordenar e persistir `order` de tópicos, conteúdos e lições. Após qualquer alteração chama `hydrateFromRemote()` para garantir convergência com o backend.
- `ResumeForm` + `ResumePreview` implementam o gerador WYSIWYG com barra de progresso adaptativa para mobile. O formulário multipasso suporta reordenação de seções, personalização de tema e exportação em PDF multipágina com quebras inteligentes, preservando links clicáveis.

### Backend (Apps Script + Google Sheets)

- `google-apps-script/Code.gs` define o schema de 8 abas: `users`, `topics`, `contents`, `lessons`, `participants`, `participant_custom_pages`, `participant_custom_schema`, `participant_custom_data`. Cada campo tem header fixo e validador (`SCHEMA.validators`) garantindo integridade antes de gravar na planilha.
- **Migração automática de schema**: `ensureCurrentHeaders` detecta e converte headers legados (inglês/camelCase) para o padrão atual (português/camelCase) sem perda de dados. Suporta:
  - Conversão de `LEGACY_HEADERS` (inglês) para headers atuais (português)
  - Mapeamento bidirecional via `FIELD_MAP` e `FIELD_MAP_REVERSE`
  - Exemplos: `uid` → `id`, `fullName` → `nomeCompleto`, `topicId` → `topicoId`, `isActive` → `ativo`
  - A função `ensureSchemaNonDestructive` pode ser executada manualmente para alinhar layout/validações na planilha.
- Autenticação:
  - `auth_login` consulta planilha de usuários, valida `passwordHash` (HMAC-SHA256 com salt aleatório) e cria sessão de 8 horas (`ScriptProperties`).
  - `auth_logout` remove a sessão e `auth_change_password` exige nonce + revalidação da senha atual.
- CRUD genérico:
  - `create`, `update`, `upsert`, `batch_upsert`, `delete` funcionam para qualquer tabela descrita no `SCHEMA`.
  - `FIELD_MAP` traduz automaticamente entre chaves antigas (ex: `topicId`) e o padrão interno (`topicoId`), simplificando compatibilidade.
  - `users` têm regras restritivas: apenas administradores podem criar/remover; usuários padrão só trocam a própria senha.
  - `participants` aceitam `batch_upsert` sem nonce (registro público). Dados brutos de progresso são armazenados como JSON compactado.
  - **Fichário personalizado**:
    - `participant_custom_pages`: define páginas/abas do fichário com ícone, cor e ordenação customizável.
    - `participant_custom_schema`: campos dinâmicos com 11 tipos suportados (text, textarea, number, date, cpf, rg, phone, email, url, select, checkbox) e validações por tipo armazenadas em JSON (`restricoes`).
    - `participant_custom_data`: valores preenchidos por participante, linkados a campo e código, com metadados JSON extensíveis.
    - Sistema de arquivamento (`arquivado: boolean`) permite ocultar campos/páginas sem perda de histórico.
    - Auditoria completa: todos os registros rastreiam criador (`criadoPor`), editor (`atualizadoPor`) e timestamps.
- Segurança complementar: validação por segredo (`API_SECRET` via query/header), optional reCAPTCHA (`RECAPTCHA_SECRET`), nonce por requisição de escrita, limitação 300 requisições/5 min por IP e lock de 30s (`LockService`) para evitar race conditions.
- **Sistema OTP para ações sensíveis**:
  - Login com código OTP via email após validação inicial (6 dígitos, 5 min de validade).
  - Reset de senha com token + OTP (72h de validade para o token, 10 min para o código).
  - Convites de usuários por email com link de ativação (72h de validade).
  - OTP administrativo para ações críticas como criação de usuários (5 min de validade).

#### Ações disponíveis

| Endpoint | Método | Ação (`action`) | Descrição resumida |
|----------|--------|-----------------|--------------------|
| `/exec`  | GET    | `dump`          | Retorna snapshot completo (users sanitizados, tópicos, conteúdos, aulas, participantes) |
| `/exec`  | GET    | `list`          | Lista registros paginados por tabela, com filtro `field=...&eq=...` |
| `/exec`  | GET    | `get`           | Busca registro por ID/código |
| `/exec`  | GET    | `nonce`         | Gera nonce obrigatório para ações de escrita (exceto batch de participantes) |
| `/exec`  | POST   | `auth_*`        | Fluxos de login/logout/troca de senha/reset de senha com OTP |
| `/exec`  | POST   | `create`/`update`/`upsert`/`batch_upsert`/`delete` | CRUD genérico; valida esquema antes da gravação |
| `/exec`  | POST   | `invite_user`   | Admin: cria convite por email com link temporário (72h) |
| `/exec`  | POST   | `accept_invite` | Usuário define senha através do token de convite |
| `/exec`  | POST   | `admin_otp_request` | Admin: solicita código OTP por email para ações sensíveis (5 min) |

### Sincronização e cache

- `memoryStore` mantém uma cópia reativa dos dados. Listeners (`subscribeTopics`, `subscribeLessons`, `subscribeProgress` etc.) alimentam hooks como `useRealtimeData`.
- Conteúdo público (tópicos/ cursos/ aulas) é salvo em `localStorage` com TTL de 5 minutos (`cache.ts`), acelerando renderização inicial.
- Progresso por participante é versionado e armazenado individualmente (`progressCache.ts`). Atualizações locais são marcadas como "dirty" e sincronizadas em background com debounce (1,5s) ou imediatamente quando o usuário deixa a página.
- `YouTubePlayer` reconstrói o tempo assistido a partir do cache local e dispara `saveLessonProgress` a cada 10 segundos ou em eventos chave (pausa, término).

### Estrutura das planilhas

| Aba | Chave primária | Principais campos |
|-----|----------------|-------------------|
| `users` | `id` | `email`, `nomeCompleto`, `perfil` (`admin`/`user`), `ativo`, `hashSenha`, `criadoEm`, `atualizadoEm`, `temSenha` |
| `topics` | `id` | `nome`, `categoria`, `cor`, `ordem`, `imagemCapaUrl`, `imagemCapaAlt`, `criadoEm`, `atualizadoEm` |
| `contents` | `id` | `topicoId`, `titulo`, `descricao`, `dificuldade`, `ordem`, `imagemCapaUrl`, `imagemCapaAlt`, `criadoEm`, `atualizadoEm` |
| `lessons` | `id` | `conteudoId`, `titulo`, `youtubeUrl`, `descricao`, `ordem`, `criadoEm`, `atualizadoEm` |
| `participants` | `codigo` | `nome`, `sobrenome`, `idade`, `sexo`, `progressoAulas`, `criadoEm`, `ultimaAtividade` |
| `participant_custom_pages` | `id` | `label`, `ordem`, `icone`, `cor`, `criadoPor`, `criadoEm`, `atualizadoPor`, `atualizadoEm`, `arquivado` |
| `participant_custom_schema` | `id` | `label`, `tipo`, `descricao`, `restricoes` (JSON), `ordem`, `paginaId`, `obrigatorio`, `criadoPor`, `criadoEm`, `atualizadoPor`, `atualizadoEm`, `arquivado` |
| `participant_custom_data` | `id` | `codigo` (participante), `campoId`, `valor`, `metadados` (JSON), `criadoPor`, `criadoEm`, `atualizadoPor`, `atualizadoEm` |

## Funcionalidades

### Para participantes
- Landing com overview dos serviços, tutorial com boas práticas de currículo e acesso rápido ao gerador de CV.
- Navegação por mini cursos com filtros, busca, estatísticas de conclusão e player integrado.
- Autenticação simplificada por código: `LearnerAccess` valida o código, ativa o participante e carrega progresso.
- Progresso salvo automaticamente com indicadores percentuais e histórico das aulas concluídas.

### Portal administrativo
- Login com desafio anti-bot após múltiplas falhas.
- Dashboard para criar/editar tópicos, cursos e aulas (drag & drop com persistência da ordem).
- Pré-visualização de aulas com player, metadados e botões de ação rápidos.
- Gestão de participantes: busca, ordenação por atividade, cadastro/edição de perfil (idade, família, casa), exclusão segura.
- **Fichário personalizado de participantes**:
  - **11 tipos de campos suportados**: `text`, `textarea`, `number`, `date`, `cpf`, `rg`, `phone`, `email`, `url`, `select`, `checkbox`.
  - Organização em páginas múltiplas customizáveis com ícones e cores.
  - Drag & drop para reordenação de campos dentro de páginas e reordenação de páginas.
  - **Validação automática por tipo**:
    - CPF: exatamente 11 dígitos
    - RG: 7-12 dígitos
    - Telefone: 10-11 dígitos (com DDD)
    - Email: formato RFC válido
    - URL: protocolo http/https obrigatório
    - Number: validação de min/max configurável
    - Date: validação de intervalo min/max configurável
  - **Formatação inteligente de exibição**:
    - CPF: XXX.XXX.XXX-XX
    - Telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    - RG: XX.XXX.XXX-X (quando aplicável)
    - Datas: formato DD/MM/AAAA localizado
    - Números: separador de milhares locale pt-BR
  - Sistema de arquivamento de campos sem perda de dados históricos.
  - Metadados completos: criação/atualização com timestamp e identificação do usuário responsável.
  - Interface responsiva com validação em tempo real, feedback visual de salvamento e sincronização via listeners Firestore-like.
- Modal de usuários para admins: CRUD de contas, promoção para administrador, ativação/desativação, reset de senha com dupla checagem.

### Gerador de currículos
- Formulário multipasso (dados pessoais, experiência, educação, habilidades, idiomas, projetos, certificações).
- **Barra de progresso responsiva**: indicadores visuais otimizados para mobile (375px), com cards compactos e porcentagem de conclusão.
- Customização de layout: tema de cores, fontes, densidade, forma da foto, divisórias e ordenação das seções em duas colunas.
- Preview em tempo real (componente `ResumePreview`) exibido lado a lado e replicado em um canvas oculto para exportação PDF.
- **Exportação PDF inteligente**: geração automática de múltiplas páginas A4 quando o conteúdo excede uma página, com quebras de página otimizadas para evitar cortes em seções.
- **Seletores de data aprimorados**: dropdowns de mês e ano com suporte a navegação rápida (até 100 anos), sincronizados com o tema claro/escuro.
- Upload opcional de foto, validação de datas (DatePicker com locale pt-BR), autoformatação de telefones e textos.
- Links clicáveis preservados no PDF exportado com mapeamento inteligente para múltiplas páginas.

### Experiência & UI
- Tema claro/escuro persistente via `ThemeSwitch` + `useTheme`, com componentes de calendário totalmente integrados.
- Microinterações com Framer Motion em cards, botões do nav, banners de feedback e tooltips (`InstantTooltip`).
- **Layouts responsivos otimizados**: design mobile-first com breakpoints dedicados para telas pequenas (375x667px), incluindo adaptação de formulários e barra de progresso.
- Componentes de data (DatePicker) com temas sincronizados e dropdowns acessíveis de mês/ano.
- Indicadores de atualização (`RealtimeIndicator`) informam sincronizações em background.
- Instalável como PWA (manifesto dedicado, ícones e service worker com cache básico).

## Fluxos críticos e segurança

- **Autenticação**: sessão opaca (`sessionToken`) emitida pelo Apps Script, armazenada apenas em memória. Renovada a cada login e utilizada em chamadas subsequentes.
- **Controle de acesso (RBAC)**:
  - **Admins**: gerenciam tudo (usuários, conteúdos, participantes, fichário personalizado).
    - Criação de usuários requer código OTP adicional por email.
    - Exclusão de participantes e campos personalizados requer perfil admin.
  - **Usuários padrão**: podem gerenciar conteúdos (tópicos/cursos/aulas) e apenas alterar a própria senha.
  - **Participantes**: podem ser criados/atualizados sem autenticação completa via `batch_upsert` (cadeia pública controlada por segredo).
  - **Fichário personalizado**: usuários autenticados podem criar/editar campos e valores; apenas admins podem excluir.
- **Proteção anti-abuso**:
  - API exige `API_SECRET` (query string ou header).
  - Nonce obrigatório para ações de escrita (exceto `participants.batch_upsert`).
  - Rate limit via CacheService (`hitLimit`) e LockService para evitar concorrência.
  - Desafio aritmético adicional no login front-end após 5 tentativas e reCAPTCHA opcional no backend.
- **Integridade de dados**:
  - **Validação por tipo/tamanho em todos os campos** via `SCHEMA.validators`:
    - `str(value, maxLength)`: trunca strings ao limite definido
    - `int(value)`: converte e valida números inteiros
    - `bool(value)`: normaliza booleanos (true/false)
    - `dateOrNow(value)`: valida datas ou usa timestamp atual
    - `jsonText(value, maxLength)`: valida e compacta JSON
  - **Normalização dedicada** para registros do fichário personalizado:
    - `normalizeCustomPageRecord`: garante UUID, ordem, metadados de auditoria
    - `normalizeCustomSchemaRecord`: valida tipo de campo, restrições JSON, obrigatoriedade
    - `normalizeCustomDataRecord`: vincula participante+campo, preserva metadados
  - Migração automática de cabeçalhos legados oculta diferenças entre nomenclaturas.
  - Hash de senha HMAC-SHA256 com salt exclusivo por usuário (256 bits).
- **Offline-friendly**:
  - Conteúdo público carrega de cache instantaneamente enquanto a sincronização completa roda em background.
  - Progresso individual persiste no navegador e é sincronizado assim que a conexão volta.

## Execução local

1. Pré-requisitos: Node.js 18 ou superior e npm.
2. Instale dependências:
   ```bash
   npm install
   ```
3. Configure `.env.local` (ver seção [Variáveis](#variáveis-de-ambiente-do-front-end)).
4. Inicie o modo desenvolvimento (porta 5173 por padrão):
   ```bash
   npm run dev
   ```
   - O Vite está configurado para proxyar `/api` para o Apps Script (ver `vite.config.ts`). Para testar localmente, deixe `VITE_REMOTE_BASE_URL=/api`.
5. Build de produção e preview:
   ```bash
   npm run build
   npm run preview
   ```

## Deploy automatizado (GitHub Pages)

- Qualquer push na branch `gitpages` dispara o workflow `.github/workflows/deploy.yml`.
- O pipeline executa `npm ci`, `npm run build` e publica o conteúdo da pasta `dist/` na branch `gh-pages` usando `peaceiris/actions-gh-pages`.
- Configure o GitHub Pages para servir a partir da branch `gh-pages` (diretório raiz). Recomenda-se apontar o backend (CORS) para a URL final do Pages.
- Caso o front dependa de variáveis sensíveis (`VITE_REMOTE_BASE_URL`, `VITE_REMOTE_API_SECRET`), crie **Repository Secrets** ou **Variables** com esses nomes para que o build de produção use os valores corretos.

## Configuração do backend (Apps Script)

1. **Planilha**: crie uma planilha com abas `users`, `topics`, `contents`, `lessons`, `participants`. Pode ser vazia.
2. **Código**: abra _Extensões → Apps Script_, substitua o conteúdo por `google-apps-script/Code.gs`.
3. **Propriedades do script** (_Project Settings → Script properties_):
   - `API_SECRET`: string longa compartilhada com o front-end (obrigatório).
   - `ALLOWED_ORIGIN`: origem autorizada (ex.: `https://seu-dominio.com`). Usada para validações CORS.
   - `RECAPTCHA_SECRET` (opcional): segredo do reCAPTCHA v3 para ativação de proteção anti-bot.
   - `EMAIL_SENDER` (opcional): email remetente para OTPs e convites (padrão: email do script).
4. **Constantes de tempo configuráveis no código**:
   - `SESSION_TTL_SEC`: 28800 (8 horas) - duração da sessão de login
   - `OTP_TTL_SEC`: 300 (5 minutos) - validade de códigos OTP de login
   - `RESET_TTL_SEC`: 600 (10 minutos) - validade de códigos OTP de reset de senha
   - `ADMIN_OTP_TTL_SEC`: 300 (5 minutos) - validade de códigos OTP administrativos
   - `INVITE_TTL_SEC`: 259200 (72 horas) - validade de convites de usuário
   - `OTP_MAX_ATTEMPTS`: 5 - tentativas máximas antes de invalidar OTP
   - Rate limiting: 300 requisições por 5 minutos por IP/endpoint
4. **Ajuste de schema e limpeza**: execute manualmente:
   - `ensureSchemaNonDestructive()`: corrige cabeçalhos, formatação de datas e validações (checkbox `ativo`, lista de `perfil`).
   - `CleanEmptyRows()`: remove linhas sem chave primária em todas as tabelas (útil para limpeza periódica).
6. **Deploy**: _Deploy → New deployment → Web app_:
   - App type: `Web app`
   - Who has access: `Anyone`
   - URL gerada será usada como base (`https://script.google.com/macros/s/.../exec`).
7. **Proxy local**: em desenvolvimento, o `vite.config.ts` já redireciona `/api` para o seu deployment. Em produção, configure `VITE_REMOTE_BASE_URL` para a URL completa do Apps Script.
8. **Permissões**: ao rodar pela primeira vez, o Apps Script solicitará autorização para acessar planilhas, propriedades, cache e enviar emails (para sistema OTP).

## Variáveis de ambiente do front-end

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_REMOTE_BASE_URL` | URL base do Apps Script. Em dev pode ser `/api` (proxy). | `/api` ou `https://script.google.com/macros/s/.../exec` |
| `VITE_REMOTE_API_SECRET` | Mesmo valor configurado em `API_SECRET` no Apps Script. | `d3d3e6f4...` |
| `VITE_PUBLIC_BASE_PATH` | Caminho público usado no deploy (GitHub Pages costuma ser `/<nome-do-repo>/`). Use `/` para domínios raiz. | `/Portal/` |

As amostras (`.env.local`, `.env.production.local`) já estão preenchidas com `/api` e um segredo placeholder.

## Estrutura de pastas

```
.
├─ google-apps-script/
│  └─ Code.gs                # API Apps Script (backend)
├─ public/
│  └─ screenshots/           # Imagens usadas no README
├─ src/
│  ├─ components/            # UI (nav, modais, cards, player, CV)
│  ├─ context/               # AuthContext, LearnerContext e tipos auxiliares
│  ├─ hooks/                 # Hooks utilitários (tema, debounce, realtime)
│  ├─ lib/                   # Stores, sincronização, caches, serviços remotos
│  ├─ pages/                 # Páginas principais (landing/admin)
│  ├─ routes/                # Guardas de rota
│  ├─ index.css              # Tokens de tema e utilidades globais
│  ├─ main.tsx               # Bootstrap da aplicação
│  └─ App.tsx                # Declaração das rotas
├─ vite.config.ts            # Proxy + build
└─ package.json
```

## Scripts npm

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia o Vite com HMR e proxy configurado |
| `npm run build` | Compila TypeScript (`tsc -b`) e gera bundle de produção |
| `npm run preview` | Serve o build gerado para inspeção |
| `npm run lint` | ESLint (`eslint.config.js`) usando regras para TS + hooks |

## Convenções e tooling

- **TypeScript estrito**: evitar `any`, modelar dados em `src/lib/types.ts`.
- **Estilo**: Tailwind 4 com tokens semânticos (`bg-theme-*`, `text-theme-*`) para manter consistência entre temas. CSS global inclui estilos otimizados para impressão e geração de PDF com quebras de página inteligentes.
- **Estado global**: nenhum Redux. Context + stores reativos garantem simplicidade e controle.
- **Importações**: preferir funções utilitárias existentes (`remoteSync`, `progress`, `memoryStore`) antes de tocar diretamente na API.
- **Segurança**: nunca expor `VITE_REMOTE_API_SECRET` em front-end público sem `nonce`. Em produção, configure domínio/HTTPS corretos para o Apps Script validar origem.
- **Lint**: `eslint.config.js` cobre React, hooks e TypeScript. Rodar `npm run lint` antes de subir mudanças.

## Roadmap

### ✅ Implementado

- ✅ Exportação de currículo multi-página sem cortes em experiências extensas
- ✅ Melhorias na responsividade para dispositivos pequenos (375px)
- ✅ Seletores de data com navegação rápida por ano
- ✅ Fichário personalizado de participantes com campos dinâmicos e páginas customizáveis
- ✅ Histórico/auditoria de alterações (metadados `criadoPor`, `atualizadoPor`, `criadoEm`, `atualizadoEm` nas tabelas com dados sensíveis)
- ✅ Logs analíticos para consumo de conteúdos (acompanhamento de progresso individual por aula/curso)

## Contato

Dúvidas ou sugestões? Abra uma issue ou procure a equipe responsável pelo projeto Extensionista. Contributions e feedbacks são bem-vindos!
