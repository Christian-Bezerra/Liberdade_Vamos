# 🏮 Liberdade, vamos?

> Uma Progressive Web App (PWA) mobile-first para planejar, organizar e aproveitar passeios pelo bairro da Liberdade, em São Paulo.

O **Liberdade, vamos?** nasceu de uma necessidade simples: tornar mais fácil organizar um passeio pela Liberdade com amigos sem depender de planilhas, mensagens espalhadas ou decisões improvisadas durante o trajeto.

A aplicação reúne lugares para visitar, horários, duração estimada, roteiro personalizado e mapa em uma única experiência otimizada para dispositivos móveis.

---

## ✨ Funcionalidades

### 🗓️ Roteiro inteligente

Monte uma sequência personalizada de lugares para visitar durante o passeio.

* Adicione e remova locais do roteiro.
* Reordene as paradas.
* Estime o horário de chegada e término.
* Calcule tempos aproximados de deslocamento.
* Identifique possíveis conflitos de horário.
* Sugira automaticamente uma sequência de visitação.
* Mantenha compromissos fixos protegidos no roteiro.

O projeto possui, por exemplo, um compromisso fixo com o **Karaokê Kampai**, das **14h às 15h**, que não pode ser deslocado pela sugestão automática de rota.

### 🧭 Explorar

Navegue pelos locais cadastrados na base do aplicativo e filtre por:

* 🍜 Comida
* ☕ Café
* 🛍️ Compras
* 🛒 Mercado
* 🏯 Cultura
* ⭐ Atividades

Também é possível pesquisar lugares e verificar informações como endereço, horário de funcionamento, duração estimada e observações.

### 🗺️ Mapa

O aplicativo possui integração com **OpenStreetMap** através do Leaflet.

É possível:

* Visualizar locais no mapa.
* Separar pontos por categoria.
* Localizar endereços automaticamente.
* Usar a localização atual do dispositivo.
* Abrir um local no OpenStreetMap.
* Obter uma rota a pé através do Google Maps.

As coordenadas encontradas por geocodificação são armazenadas localmente no dispositivo.

### ❤️ Favoritos e locais visitados

Marque lugares que despertaram interesse e acompanhe quais locais já foram visitados.

Essas informações permanecem armazenadas no navegador do dispositivo.

### 📝 Notas pessoais

Cada local pode receber uma anotação pessoal.

Por exemplo:

> "Experimentar o choux do Kazu."

As notas são armazenadas localmente e não exigem criação de conta.

### 📤 Compartilhamento

O roteiro pode ser compartilhado com outras pessoas através da API de compartilhamento nativa do dispositivo quando disponível.

Em navegadores sem suporte, o aplicativo utiliza a área de transferência como alternativa.

### 📱 Progressive Web App

O projeto foi desenvolvido como uma **PWA**, permitindo uma experiência semelhante à de um aplicativo instalado.

O Service Worker realiza o cache dos principais arquivos da aplicação para permitir que partes do sistema continuem acessíveis mesmo quando a conexão estiver indisponível.

> O mapa e a geocodificação ainda dependem de serviços externos e, portanto, não funcionam completamente offline.

---

## 🛠️ Tecnologias

### Frontend

* **HTML5**
* **CSS3**
* **JavaScript**
* **Leaflet.js**
* **Progressive Web App (PWA)**
* **Web Storage API / localStorage**
* **Geolocation API**
* **Web Share API**
* **Service Worker**

### Backend / servidor local

* **C#**
* **ASP.NET Core**
* **.NET 10**

O backend é propositalmente simples: ele funciona como um servidor HTTP local para disponibilizar os arquivos estáticos da aplicação.

### Dados e mapas

* **JSON** para armazenamento da base de lugares.
* **OpenStreetMap** para mapas.
* **Nominatim** para geocodificação de endereços.
* **Google Maps** para geração de rotas a pé.

---

## 🏗️ Arquitetura

O projeto possui uma arquitetura simples e adequada ao objetivo da primeira versão:

```text
liberdade-passeio/
│
├── index.html
├── app.js
├── styles.css
├── data.json
├── manifest.webmanifest
├── sw.js
├── serve.ps1
│
├── assets/
│   └── icon.svg
│
└── server/
    ├── Liberdade.Server.csproj
    └── Program.cs
```

### Fluxo simplificado

```text
             ┌───────────────┐
             │   data.json   │
             └───────┬───────┘
                     │
                     ▼
             ┌───────────────┐
             │    app.js     │
             │               │
             │ Estado local  │
             │ Roteiro       │
             │ Filtros       │
             │ Mapa          │
             └───────┬───────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
     localStorage  Leaflet   APIs Web
                              │
                       ┌──────┴──────┐
                       ▼             ▼
                  Geolocation   Web Share
```

O estado do usuário é mantido localmente:

```javascript
{
    "plan": [],
    "favorites": [],
    "visited": [],
    "notes": {},
    "coords": {}
}
```

Isso permite utilizar o aplicativo sem sistema de autenticação ou banco de dados na primeira versão.

---

## 🚀 Como executar

### Pré-requisitos

* Windows
* **.NET 10 SDK**
* PowerShell

### 1. Clone o repositório

```bash
git clone https://github.com/SEU-USUARIO/liberdade-passeio.git
cd liberdade-passeio
```

### 2. Execute o servidor

No PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

O servidor será iniciado na porta `4173`.

### 3. Acesse pelo computador

Abra:

```text
http://127.0.0.1:4173
```

### 4. Acesse pelo celular

Para testar no celular durante o desenvolvimento:

1. Conecte computador e celular à mesma rede Wi-Fi.
2. Execute `ipconfig` no computador.
3. Identifique o endereço IPv4 da máquina.
4. Acesse no celular:

```text
http://SEU-IP:4173
```

Caso o Windows Firewall solicite permissão, permita o acesso em redes privadas.

---

## 📍 Base de lugares

Os locais disponíveis no aplicativo são definidos em:

```text
data.json
```

Cada estabelecimento possui informações como:

```json
{
    "id": "exemplo",
    "name": "Nome do local",
    "address": "Endereço",
    "category": "comida",
    "hours": "11:00–22:00",
    "duration": 45,
    "notes": [
        "Observação sobre o local"
    ]
}
```

As durações são **estimativas editáveis**, não tempos oficiais de permanência.

As coordenadas inicialmente podem permanecer vazias. O usuário pode utilizar a funcionalidade **Localizar endereços** para consultar o Nominatim/OpenStreetMap.

---

## 🔒 Privacidade

O projeto foi desenvolvido inicialmente sem necessidade de contas ou backend para dados pessoais.

Informações como:

* roteiro;
* favoritos;
* locais visitados;
* notas;
* coordenadas geocodificadas;

são armazenadas no `localStorage` do navegador.

A localização atual do usuário também não é enviada para um servidor próprio: ela é utilizada localmente pela aplicação durante a sessão.

---

## ⚠️ Limitações atuais

Esta é uma primeira versão do projeto.

Atualmente:

* Não existe autenticação.
* Não existe banco de dados.
* Não há sincronização de roteiro entre amigos.
* O roteiro é armazenado individualmente em cada dispositivo.
* O mapa depende da disponibilidade do OpenStreetMap.
* A geocodificação depende do Nominatim e de conexão com a internet.
* As durações dos locais são estimativas.
* A sugestão de sequência utiliza uma heurística simples, não um algoritmo completo de otimização de rotas.
* O servidor ASP.NET Core serve essencialmente como host dos arquivos da aplicação.

---

## 🛣️ Roadmap

### Curto prazo

* [ ] Melhorar o algoritmo de ordenação do roteiro.
* [ ] Calcular deslocamentos reais entre todos os pontos.
* [ ] Melhorar a experiência do mapa em dispositivos móveis.
* [ ] Adicionar mais informações aos estabelecimentos.
* [ ] Criar testes automatizados para a lógica do roteiro.

### Médio prazo

* [ ] Criar roteiros compartilháveis.
* [ ] Permitir que vários amigos participem do mesmo passeio.
* [ ] Sincronizar alterações em tempo real.
* [ ] Adicionar autenticação.
* [ ] Migrar dados persistentes para um backend.
* [ ] Criar sistema de grupos.

### Futuro

* [ ] Recomendação personalizada de lugares.
* [ ] Otimização de rotas considerando distância, duração e horários.
* [ ] Integração com informações de funcionamento em tempo real.
* [ ] Modo de passeio colaborativo.
* [ ] Sugestões baseadas nas preferências do grupo.

---

## 🎯 Objetivo do projeto

Mais do que ser apenas um catálogo de lugares, o **Liberdade, vamos?** busca transformar a organização de um passeio em uma experiência simples:

> **Escolher → Organizar → Explorar → Compartilhar → Aproveitar**

O projeto também serve como laboratório para aplicar conceitos de desenvolvimento web, Progressive Web Apps, persistência local, integração com APIs externas, geolocalização e organização de interfaces mobile-first.

---

## 👨‍💻 Autor

**Christian dos Santos Bezerra**

Estudante de Engenharia da Computação interessado em desenvolvimento de software, programação, tecnologia e construção de projetos práticos.

---

## 📄 Licença

Este projeto ainda não possui uma licença open source definida.
