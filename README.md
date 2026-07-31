# Liberdade, vamos?

Aplicação PWA mobile-first para montar um passeio na Liberdade.

## Abrir localmente

1. Abra o PowerShell nesta pasta.
2. Execute `powershell -ExecutionPolicy Bypass -File .\serve.ps1`.
3. No computador, abra `http://127.0.0.1:4173`. Para abrir no celular, deixe computador e telefone na mesma rede Wi-Fi, descubra o IPv4 do computador com `ipconfig` e acesse `http://SEU-IP:4173`. Se o Windows perguntar, permita acesso em redes privadas.

O app não exige conta. Favoritos, roteiro, lugares visitados, coordenadas encontradas e notas ficam apenas no navegador deste aparelho.

## Dados

Edite `data.json` para manter os locais. Os endereços e horários são os da base inicial; as durações foram sinalizadas como estimativas editáveis. Coordenadas começam vazias por escolha: o botão **Localizar endereços** consulta o OpenStreetMap quando houver conexão e as guarda localmente.

## Limites da primeira versão

- O mapa usa OpenStreetMap e depende de conexão para baixar o mapa e consultar endereços.
- Não há sincronização entre amigos ainda. O botão de compartilhar copia/compartilha o resumo do roteiro.
- O compromisso do Karaokê Kampai das 14h às 15h está bloqueado no roteiro. A base registra o endereço na Av. da Liberdade, 638 e funcionamento das 14h às 4h.
