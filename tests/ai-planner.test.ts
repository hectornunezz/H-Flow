import { AiPlannerService } from "../hflow-backend/src/services/aiPlanner.service";

describe("AiPlannerService", () => {
  const service = new AiPlannerService();
  const athlete = {
    name: "Alex",
    objective: "Build strength",
    currentWeight: 78,
  };
  const fetchMock = jest.spyOn(global, "fetch");

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    fetchMock.mockReset();
  });

  afterAll(() => {
    fetchMock.mockRestore();
    delete process.env.OPENAI_API_KEY;
  });

  it("requests a structured workout draft from gpt-4o-mini", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  type: "workout",
                  title: "Fuerza inicial",
                  description: "Tres sesiones semanales con descanso.",
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(service.generatePlan("workout", athlete)).resolves.toEqual({
      type: "workout",
      title: "Fuerza inicial",
      description: "Tres sesiones semanales con descanso.",
    });

    const [, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(String(options?.body));
    expect(requestBody.model).toBe("gpt-4o-mini");
    expect(requestBody.response_format.type).toBe("json_schema");
    expect(requestBody.messages[1].content).toContain("78 kg");
  });

  it("rejects nutrition drafts with unsafe calorie targets", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  type: "nutrition",
                  details: "Plan diario de ejemplo.",
                  calories: 900,
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(service.generatePlan("nutrition", athlete)).rejects.toThrow(
      "OpenAI returned an invalid nutrition plan",
    );
  });

  it("reports missing OpenAI configuration without making a request", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(service.generatePlan("workout", athlete)).rejects.toThrow(
      "OpenAI plan generation is not configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
