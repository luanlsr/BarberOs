export type EmailTemplateKey =
  'checkout.credentials.v1' | 'auth.password-change.v1' | 'auth.password-reset.v1';

type RenderEmailInput = {
  key: EmailTemplateKey;
  variables: Record<string, string>;
};

const fallbackTemplates: Record<EmailTemplateKey, { subject: string; html: string; text: string }> =
  {
    'checkout.credentials.v1': {
      subject: 'Seu acesso ao BarberOS está pronto',
      html: '<h1>Bem-vindo ao BarberOS</h1><p>Email: {{email}}</p><p>Senha inicial: {{temporaryPassword}}</p><p><a href="{{loginUrl}}">Entrar no BarberOS</a></p>',
      text: 'Bem-vindo ao BarberOS. Email: {{email}} Senha inicial: {{temporaryPassword}} Acesse: {{loginUrl}}',
    },
    'auth.password-change.v1': {
      subject: 'Sua senha do BarberOS foi alterada',
      html: '<h1>Senha alterada</h1><p>Sua senha do BarberOS foi alterada.</p><p><a href="{{loginUrl}}">Acessar conta</a></p>',
      text: 'Sua senha do BarberOS foi alterada. Acesse: {{loginUrl}}',
    },
    'auth.password-reset.v1': {
      subject: 'Recupere sua senha do BarberOS',
      html: '<h1>Recuperar senha</h1><p><a href="{{resetUrl}}">Criar nova senha</a></p>',
      text: 'Recupere sua senha do BarberOS: {{resetUrl}}',
    },
  };

export function renderEmailTemplate(input: RenderEmailInput) {
  const template = fallbackTemplates[input.key];
  return {
    subject: replaceVariables(template.subject, input.variables),
    html: replaceVariables(template.html, input.variables),
    text: replaceVariables(template.text, input.variables),
  };
}

function replaceVariables(value: string, variables: Record<string, string>) {
  return value.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key: string) => variables[key] ?? '');
}
