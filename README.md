# MedDia — Expo SDK 58

Aplicativo acadêmico em JavaScript e React Native.

## Executar

No Terminal, dentro desta pasta:

    npm start

Abra o Expo Go no Android e leia o QR Code.
Celular e computador devem estar na mesma rede Wi-Fi.

Se a conexão falhar, encerre com Ctrl+C e execute:

    npm run tunnel

## Organização

- App.js: provedores e navegação.
- src/components: componentes reutilizáveis.
- src/screens: telas.
- src/context: estado compartilhado e persistência.
- src/services: notificações.
- src/utils: regras de horários e datas.
- src/theme.js: cores e opções de humor.

## Funcionalidades

- Cadastro, edição e exclusão de medicamentos.
- Horários diários e notificações locais com som.
- Registro de dose tomada ou pulada, com opção de desfazer no dia.
- Diário de humor, sentimentos e sintomas.
- Histórico com filtros.
- Persistência local no AsyncStorage.

## Testar no Android

1. Use o botão de teste de notificação na tela Hoje.
2. Autorize notificações.
3. Cadastre um medicamento com horário alguns minutos à frente.
4. Confira a notificação em segundo plano e o som.
5. Registre uma dose e consulte o Histórico.
6. Registre humor e sintomas no Diário.
7. Feche e reabra o projeto para conferir os dados salvos.

O som e a pontualidade dependem das permissões, volume, modo Não Perturbe
e restrições de bateria do Android. Os horários são diários e locais.

Uma dose sem confirmação não é automaticamente marcada como pulada.
O histórico mostra ações registradas pelo usuário.

O diário não identifica automaticamente reações adversas.

Os dados ficam no aparelho, sem login, backup ou sincronização.
AsyncStorage não é criptografado: use dados fictícios na apresentação.
Limpar os dados ou desinstalar o Expo Go pode apagar os registros.

## Testes das regras de agenda

    npm test

A navegação e as notificações precisam ser conferidas no Android físico.
