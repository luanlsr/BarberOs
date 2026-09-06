## Purpose

Define o diretorio operacional de profissionais, servicos e clientes usado pela agenda, CRM e futuras comandas, sempre isolado por tenant e filial autorizada.

## ADDED Requirements

### Requirement: Professional records

O sistema SHALL permitir criar, listar, atualizar e arquivar profissionais dentro do tenant, vinculando-os a uma ou mais filiais autorizadas, com nome, contato opcional, papel operacional, status e metadados de exibicao.

#### Scenario: Create professional in authorized branch

- **WHEN** um usuario com `professionals.create` cria um profissional em uma filial dentro do seu escopo
- **THEN** o sistema persiste o profissional no tenant ativo e permite que ele seja usado na agenda dessa filial

#### Scenario: Professional outside branch scope

- **WHEN** a requisicao tenta vincular um profissional a uma filial fora do escopo autorizado do usuario
- **THEN** o sistema rejeita a operacao sem criar ou alterar o profissional

#### Scenario: Archived professional

- **WHEN** um profissional e arquivado
- **THEN** o sistema remove o profissional de novas selecoes operacionais sem apagar seu historico de agenda

### Requirement: Service catalog records

O sistema SHALL permitir criar, listar, atualizar e arquivar servicos tenant-scoped com nome, categoria, descricao opcional, duracao, preco, custo estimado opcional, status e profissionais habilitados.

#### Scenario: Create service

- **WHEN** um usuario com `services.create` informa dados validos de servico
- **THEN** o sistema persiste o servico e disponibiliza sua selecao para profissionais habilitados

#### Scenario: Invalid service duration or price

- **WHEN** um servico e enviado com duracao ou preco invalido
- **THEN** o sistema rejeita a operacao com codigo de erro estavel e nao persiste o servico

#### Scenario: Service archive

- **WHEN** um servico e arquivado
- **THEN** o sistema impede seu uso em novos agendamentos e preserva referencias historicas existentes

### Requirement: Customer records

O sistema SHALL permitir criar, localizar, atualizar e arquivar clientes tenant-scoped com nome, telefone, email opcional, aniversario opcional, observacoes, origem, consentimentos e profissional preferido opcional.

#### Scenario: Create customer from scheduling flow

- **WHEN** um usuario com `customers.create` cadastra um cliente durante a criacao de agendamento
- **THEN** o sistema persiste o cliente no tenant ativo e o retorna como selecionavel no fluxo de agenda

#### Scenario: Search customers by allowed tenant

- **WHEN** um usuario com `customers.read` busca clientes por nome ou telefone
- **THEN** o sistema retorna apenas clientes pertencentes ao tenant ativo e filiais permitidas pelo contexto quando aplicavel

#### Scenario: Customer archive

- **WHEN** um cliente e arquivado
- **THEN** o sistema oculta o cliente das listas operacionais padrao e preserva seu historico

### Requirement: Directory authorization and isolation

O sistema SHALL aplicar autenticacao, permissao, entitlement `core.operations`, tenant ativo e escopo de filial em toda leitura e escrita de profissionais, servicos e clientes.

#### Scenario: Missing permission

- **WHEN** o usuario nao possui a permissao exigida para uma acao do diretorio operacional
- **THEN** o sistema rejeita a operacao antes de executar qualquer efeito colateral

#### Scenario: Cross-tenant directory access

- **WHEN** uma requisicao tenta ler ou escrever profissional, servico ou cliente de outro tenant
- **THEN** o sistema rejeita a operacao sem retornar dados identificadores do registro protegido

#### Scenario: Database isolation

- **WHEN** uma consulta do diretorio chega ao banco sem escopo valido de tenant
- **THEN** as politicas de isolamento do banco impedem leitura ou escrita de registros operacionais
