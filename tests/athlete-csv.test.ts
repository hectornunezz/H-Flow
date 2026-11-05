import { parseAthleteCsv } from "../hflow-backend/src/services/athleteCsv.service";

describe("parseAthleteCsv", () => {
  it("parses English headers, quoted commas, and UTF-8 BOM", () => {
    expect(
      parseAthleteCsv(
        '\uFEFFname,objective,weight\r\n"Ana García","Strength, mobility",62.5\r\n',
      ),
    ).toEqual([
      { name: "Ana García", objective: "Strength, mobility", currentWeight: 62.5 },
    ]);
  });

  it("parses Spanish headers, semicolon separators, and decimal commas", () => {
    expect(
      parseAthleteCsv("nombre;objetivo;peso\r\nLuis;Ganar fuerza;74,5\r\n"),
    ).toEqual([{ name: "Luis", objective: "Ganar fuerza", currentWeight: 74.5 }]);
  });

  it("rejects all rows when a row contains an invalid weight", () => {
    expect(() => parseAthleteCsv("nombre,objetivo,peso\nAna,Fuerza,60\nLuis,Resistencia,0"))
      .toThrow("El CSV contiene filas no válidas.");
  });

  it("rejects files without required headers", () => {
    expect(() => parseAthleteCsv("nombre,peso\nAna,60")).toThrow(
      "El CSV debe incluir columnas nombre/name, objetivo/objective y peso/weight.",
    );
  });
});
