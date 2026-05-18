package mailer

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"html/template"
	"mime"
	"net"
	"net/mail"
	"net/smtp"
	"strings"

	"expensemania-backend/internal/config"
)

type Mailer struct {
	host     string
	port     int
	username string
	password string
	from     string
}

func New(cfg config.Config) *Mailer {
	return &Mailer{
		host:     cfg.SMTPHost,
		port:     cfg.SMTPPort,
		username: cfg.SMTPUsername,
		password: cfg.SMTPPassword,
		from:     cfg.SMTPFrom,
	}
}

func (m *Mailer) SendPasswordReset(to, resetURL string) error {
	if strings.TrimSpace(m.host) == "" || m.port == 0 || strings.TrimSpace(m.from) == "" {
		return fmt.Errorf("smtp is not configured")
	}
	subject := "Reset your SpendSync password"
	body, err := renderPasswordReset(resetURL)
	if err != nil {
		return err
	}
	return m.sendHTML(to, subject, body)
}

func (m *Mailer) sendHTML(to, subject, htmlBody string) error {
	fromAddr, err := mail.ParseAddress(m.from)
	if err != nil {
		return err
	}
	toAddr, err := mail.ParseAddress(to)
	if err != nil {
		return err
	}

	headers := map[string]string{
		"From":         fromAddr.String(),
		"To":           toAddr.String(),
		"Subject":      mime.QEncoding.Encode("UTF-8", subject),
		"MIME-Version": "1.0",
		"Content-Type": `text/html; charset="UTF-8"`,
	}
	var msg bytes.Buffer
	for key, value := range headers {
		msg.WriteString(key)
		msg.WriteString(": ")
		msg.WriteString(value)
		msg.WriteString("\r\n")
	}
	msg.WriteString("\r\n")
	msg.WriteString(htmlBody)

	addr := net.JoinHostPort(m.host, fmt.Sprintf("%d", m.port))
	var auth smtp.Auth
	if m.username != "" || m.password != "" {
		auth = smtp.PlainAuth("", m.username, m.password, m.host)
	}
	if m.port == 465 {
		return m.sendTLS(addr, auth, fromAddr.Address, []string{toAddr.Address}, msg.Bytes())
	}
	return m.sendSTARTTLS(addr, auth, fromAddr.Address, []string{toAddr.Address}, msg.Bytes())
}

func (m *Mailer) sendTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: m.host, MinVersion: tls.VersionTLS12})
	if err != nil {
		return err
	}
	defer conn.Close()
	client, err := smtp.NewClient(conn, m.host)
	if err != nil {
		return err
	}
	defer client.Close()
	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return err
		}
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	for _, recipient := range to {
		if err := client.Rcpt(recipient); err != nil {
			return err
		}
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write(msg); err != nil {
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}
	return client.Quit()
}

func (m *Mailer) sendSTARTTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return err
	}
	defer conn.Close()
	client, err := smtp.NewClient(conn, m.host)
	if err != nil {
		return err
	}
	defer client.Close()
	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: m.host, MinVersion: tls.VersionTLS12}); err != nil {
			return err
		}
	}
	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return err
		}
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	for _, recipient := range to {
		if err := client.Rcpt(recipient); err != nil {
			return err
		}
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write(msg); err != nil {
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}
	return client.Quit()
}

func renderPasswordReset(resetURL string) (string, error) {
	const tpl = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reset your password</title>
</head>
<body style="margin:0;background:#FAF3E1;color:#222222;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF3E1;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff8e8;border:1px solid rgba(250,129,17,.22);border-radius:24px;overflow:hidden;box-shadow:0 24px 70px rgba(34,34,34,.12);">
          <tr>
            <td style="padding:32px 32px 10px;">
              <div style="display:inline-block;background:#FA8111;color:#ffffff;border-radius:16px;padding:10px 14px;font-weight:800;letter-spacing:.02em;">SpendSync</div>
              <h1 style="font-size:28px;line-height:1.2;margin:28px 0 10px;color:#222222;">Reset your password</h1>
              <p style="font-size:15px;line-height:1.7;margin:0;color:#5d564a;">Use the secure link below to set a new password. The link expires in 30 minutes and can be used once.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;">
              <a href="{{.ResetURL}}" style="display:inline-block;background:#FA8111;color:#ffffff;text-decoration:none;font-weight:700;border-radius:14px;padding:14px 20px;box-shadow:0 12px 28px rgba(250,129,17,.28);">Reset password</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px;">
              <p style="font-size:13px;line-height:1.6;color:#766a5b;margin:0;">If the button does not work, paste this URL into your browser:</p>
              <p style="font-size:12px;line-height:1.6;word-break:break-all;color:#222222;margin:8px 0 0;">{{.ResetURL}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
	var buf bytes.Buffer
	err := template.Must(template.New("password-reset").Parse(tpl)).Execute(&buf, struct {
		ResetURL string
	}{ResetURL: resetURL})
	return buf.String(), err
}
