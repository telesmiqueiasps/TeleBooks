"""
Serviço de envio de e-mails transacionais e de boas-vindas via Brevo SMTP.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self) -> None:
        pass

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str = "",
    ) -> bool:
        """
        Envia um e-mail formatado via Brevo SMTP (TLS na porta 587).
        """
        if not settings.smtp_configured:
            logger.warning(
                "Tentativa de envio de e-mail ignorada: credenciais SMTP do Brevo não configuradas."
            )
            return False

        try:
            msg = MIMEMultipart("alternative")
            sender = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
            msg["From"] = sender
            msg["To"] = to_email
            msg["Subject"] = subject

            # Versão em texto puro para clientes legados
            if text_content:
                msg.attach(MIMEText(text_content, "plain", "utf-8"))

            # Versão HTML rica com design editorial
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAILS_FROM_EMAIL, [to_email], msg.as_string())

            logger.info("E-mail enviado com sucesso para %s (assunto: '%s')", to_email, subject)
            return True

        except smtplib.SMTPException as e:
            logger.error("Erro de SMTP ao enviar e-mail para %s: %s", to_email, e)
            return False
        except Exception as e:
            logger.error("Falha inesperada no envio de e-mail para %s: %s", to_email, e)
            return False

    def send_welcome_email(
        self,
        to_email: str,
        username: str,
        full_name: str | None = None,
    ) -> bool:
        """
        Dispara e-mail de boas-vindas com estética editorial premium para o novo leitor.
        """
        display_name = full_name.split()[0] if full_name else f"@{username}"
        subject = f"Bem-vindo ao TeleBooks, {display_name}!"
        frontend_url = settings.FRONTEND_URL.rstrip("/")

        text_content = f"""
Olá, {display_name}!

Seja muito bem-vindo ao TeleBooks, seu novo refúgio literário digital.
Sua conta (@{username}) foi criada com sucesso!

No TeleBooks você pode:
- Organizar sua estante pessoal com status detalhados de leitura.
- Acompanhar seu progresso página por página.
- Descobrir novos livros, autores e editoras no catálogo compartilhado.
- Fazer upload de capas e gerenciar sua biblioteca com total privacidade.

Acesse sua biblioteca agora mesmo: {frontend_url}

Boas leituras,
Equipe TeleBooks
""".strip()

        html_content = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf8f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #faf8f5; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="580" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e7e3da; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Editorial -->
          <tr>
            <td style="background-color: #14171d; padding: 32px 30px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #2563eb; color: #ffffff; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; font-weight: bold; font-size: 20px; margin-bottom: 8px;">
                      📖
                    </div>
                    <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                      TeleBooks
                    </h1>
                    <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">
                      Seu Refúgio Literário
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Conteúdo Principal -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; color: #111827; line-height: 1.3;">
                Olá, {display_name}!
              </h2>
              
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">
                Seja muito bem-vindo ao <strong>TeleBooks</strong>! Sua conta de leitor (<strong>@{username}</strong>) foi ativada com sucesso.
              </p>

              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">
                Desenvolvemos o TeleBooks para leitores que apreciam um espaço limpo, elegante e intuitivo para transformar sua experiência com os livros.
              </p>

              <!-- Grid de Destaques -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 14px 16px; background-color: #fdfbf7; border: 1px solid #f0ece3; border-radius: 10px; margin-bottom: 10px; display: block;">
                    <strong style="color: #d97706; font-size: 14px;">📚 Sua Estante, Suas Regras</strong>
                    <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
                      Organize suas obras por status (<em>Quero Ler</em>, <em>Lendo</em>, <em>Lido</em>) e marque seus favoritos.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="height: 10px;"></td>
                </tr>
                <tr>
                  <td style="padding: 14px 16px; background-color: #fdfbf7; border: 1px solid #f0ece3; border-radius: 10px; margin-bottom: 10px; display: block;">
                    <strong style="color: #2563eb; font-size: 14px;">✍️ Progresso e Notas Privadas</strong>
                    <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
                      Acompanhe seu avanço página a página e guarde reflexões que só você pode ler.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="height: 10px;"></td>
                </tr>
                <tr>
                  <td style="padding: 14px 16px; background-color: #fdfbf7; border: 1px solid #f0ece3; border-radius: 10px; display: block;">
                    <strong style="color: #059669; font-size: 14px;">☁️ Capas e Catálogo Global</strong>
                    <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
                      Cadastre novos livros e envie capas direto do seu computador com armazenamento no Cloudflare R2.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Botão de Ação (CTA) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="{frontend_url}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                      Acessar Minha Biblioteca &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                Ou acesse diretamente pelo link: <a href="{frontend_url}" style="color: #2563eb; text-decoration: underline;">{frontend_url}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #faf8f5; padding: 24px 30px; text-align: center; border-top: 1px solid #f0ece3;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280;">
                TeleBooks &bull; Plataforma editorial para leitores
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                Enviado para {to_email}. Você recebeu este e-mail porque se cadastrou no TeleBooks.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""".strip()

        return self.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )


email_service = EmailService()
