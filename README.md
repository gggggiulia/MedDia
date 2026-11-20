# MedDia

Aplicativo mobile para gerenciamento pessoal de medicamentos, controle de estoque e acompanhamento diário de bem-estar e sintomas, desenvolvido com **React Native** e **Expo**.

O **MedDia** foi projetado com foco em **utilidade clínica**, **prevenção de erros de entrada** e **aderência à rotina real do paciente** — lidando de forma inteligente com atrasos, antecipações de doses e tratamentos temporários.

---

## Funcionalidades Principais

### 1. Agenda Diária Inteligente (`Hoje`)
* **Visão cronológica do dia:** Lista todas as doses previstas com barra de progresso diária e status visual (*Pendente*, *Tomada*, *Pulada* ou *Horário ajustado*).
* **Ações rápidas com opção de desfazer:** Marcação de dose tomada ou pulada com um toque e botão *Desfazer* que restaura automaticamente o estado anterior (incluindo estoque e horários recalculados).
* **Adiamento (Soneca) e recálculo dinâmico de intervalos:**
  * Permite adiar uma dose em `+15 min`, `+30 min` ou `+1 hora` com reagendamento de alarme.
  * Para medicamentos cadastrados **por intervalo**, ao marcar a dose como tomada (seja com atraso ou antecipadamente), o aplicativo recalcula automaticamente os horários seguintes do dia a partir da **hora real em que o remédio foi ingerido**.

### 2. Cadastro à Prova de Erros (`Medicamentos`)
* **Seleção nativa de horários:** Integração com o relógio nativo do sistema (`@react-native-community/datetimepicker`) e presets rápidos com toggle (*Agora*, *Manhã*, *Almoço*, *Tarde*, *Noite*, *Dormir*), eliminando erros de digitação.
* **Agendamento fixo ou por intervalo:**
  * **Horários fixos:** Seleção de múltiplas tags horárias ordenadas automaticamente.
  * **Por intervalo:** Cálculo automático das doses diárias (a cada `6h`, `8h`, `12h` ou `24h`), ignorando horários já passados no dia em que o medicamento foi cadastrado.
* **Duração de tratamento flexível:**
  * **Uso contínuo** (indefinido);
  * **Por quantidade de dias** (ex.: antibióticos de `5`, `7`, `10` ou `14` dias) com cálculo automático da data final;
  * **Até uma data específica** selecionada no calendário nativo;
  * **Até acabar o estoque**, encerrando o ciclo e desativando lembretes automaticamente quando a última unidade é tomada.
* **Controle de estoque e reposição:** Desconto automático a cada dose tomada, alerta visual quando atinge a margem mínima definida e botão de reposição rápida de caixa/cartela.
* **Notificações locais:** Lembretes diários com som configuráveis individualmente por medicamento.

### 3. Diário de Bem-Estar e Sintomas (`Diário`)
* Registro rápido de **humor**, **sentimentos** e **sintomas físicos** percebidos no dia.
* Associação direta com os medicamentos em uso e campo para observações livres.

### 4. Histórico e Síntese Clínica (`Histórico`)
* **Resumo automático dos últimos 7 dias:**
  * Taxa de adesão geral e **detalhada por medicamento**;
  * Indicador de pontualidade (doses tomadas com mais de 30 minutos de atraso);
  * Humor predominante e frequência de sintomas cruzados com os medicamentos em uso;
  * Alerta consolidado de medicamentos próximos do fim do estoque.
* **Compartilhamento para consulta médica:** Exportação formatada do relatório semanal via menu nativo de compartilhamento (WhatsApp, e-mail, etc.).
* **Gestão de registros:** Filtro por tipo (*Tudo*, *Doses*, *Diário*), exclusão individual de registros e limpeza de histórico antigo.

---

## 🛠️ Tecnologias Utilizadas

* **React Native** & **Expo**
* **React Navigation** (Bottom Tabs + Native Stack)
* **AsyncStorage** (`@react-native-async-storage/async-storage`) para persistência local offline-first
* **Expo Notifications** (`expo-notifications`) para lembretes locais e sonecas
* **React Native Community DateTimePicker** (`@react-native-community/datetimepicker`) para seletores nativos de hora e data

---

## Estrutura do Projeto

```text
MedDia/
├── App.js                        # Ponto de entrada e configuração de navegação
├── app.json                      # Configurações do projeto Expo e tema Android
├── src/
│   ├── components/
│   │   └── UI.js                 # Componentes reutilizáveis (Card, Button, Field, Heading, Page)
│   ├── context/
│   │   └── AppContext.js         # Gerenciamento de estado global, regras de negócio e persistência
│   ├── screens/
│   │   ├── Today.js              # Tela principal com doses do dia e modal de adiamento
│   │   ├── Medicines.js          # Listagem de medicamentos, estoque e status de tratamento
│   │   ├── MedicineForm.js       # Formulário de cadastro e edição de medicamentos
│   │   ├── Diary.js              # Registro de humor, sentimentos e sintomas
│   │   └── History.js            # Síntese clínica semanal, compartilhamento e histórico
│   ├── services/
│   │   ├── notifications.js      # Agendamento e cancelamento de notificações locais
│   │   └── storage.js            # Camada de leitura e gravação no AsyncStorage
│   ├── theme.js                  # Paleta de cores, tipografia e escalas de humor
│   └── utils/
│       └── domain.js             # Regras de domínio (cálculo de intervalos, doses do dia e relatórios)
```

---

## Como Executar o Projeto

### Pré-requisitos
* [Node.js](https://nodejs.org/) (LTS)
* Aplicativo **Expo Go** instalado no dispositivo Android/iOS ou emulador configurado

### Passo a passo

1. **Clone o repositório:**
   ```bash
   git clone <URL_DO_SEU_REPOSITORIO>
   cd MedDia
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento do Expo:**
   ```bash
   npx expo start
   ```

4. **Abra no dispositivo:**
   * Escaneie o QR Code exibido no terminal utilizando o aplicativo **Expo Go** (Android) ou a câmera (iOS).
