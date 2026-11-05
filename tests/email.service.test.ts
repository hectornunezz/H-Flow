const mockSendMail = jest.fn().mockResolvedValue({});
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));

jest.doMock("nodemailer", () => ({
  __esModule: true,
  default: { createTransport: mockCreateTransport },
}));

const { EmailService } = require("../hflow-backend/src/services/email.service") as {
  EmailService: new () => {
    sendWelcomeEmail(email: string, name: string): Promise<void>;
  };
};

describe("SMTP transport security", () => {
  const previousEnvironment = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_FROM: process.env.SMTP_FROM,
  };

  beforeEach(() => {
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_PORT = "587";
    delete process.env.SMTP_SECURE;
    process.env.SMTP_USER = "trainer";
    process.env.SMTP_PASSWORD = "test-password";
    process.env.SMTP_FROM = "coach@example.test";
    mockCreateTransport.mockClear();
    mockSendMail.mockClear();
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("requires STARTTLS when authenticated SMTP uses a non-implicit-TLS port", async () => {
    await new EmailService().sendWelcomeEmail("athlete@example.test", "Athlete");

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: "smtp.example.test",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: "trainer", pass: "test-password" },
    });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});
