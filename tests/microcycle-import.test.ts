import {
  MicrocycleImportError,
  parseMicrocycleImport,
} from "../hflow-backend/src/services/microcycleImport.service";

describe("parseMicrocycleImport", () => {
  it("parses repeated week blocks from a tab-separated spreadsheet paste", () => {
    const input = [
      "Microciclo 1",
      "Ejercicio\tSeries\tReps objetivo\tRIR objetivo\tDescanso\tTécnica de Intensidad",
      "Sentadilla\t4\t8\t2\t120 s\t",
      "Press banca\t3\t8-10\t2-3\t90 s\tRest-Pause",
      "",
      "Microciclo 2",
      "Ejercicio\tSeries\tReps objetivo\tRIR objetivo\tDescanso\tTécnica de Intensidad",
      "Sentadilla\t5\t6\t2\t150 s\tBack-Off",
    ].join("\n");

    expect(parseMicrocycleImport(input)).toEqual([
      {
        number: 1,
        exercises: [
          {
            exercise: "Sentadilla",
            sets: 4,
            targetReps: "8",
            targetRir: "2",
            rest: "120 s",
            intensityTechnique: null,
            sourceRow: 3,
          },
          {
            exercise: "Press banca",
            sets: 3,
            targetReps: "8-10",
            targetRir: "2-3",
            rest: "90 s",
            intensityTechnique: "Rest-Pause",
            sourceRow: 4,
          },
        ],
      },
      {
        number: 2,
        exercises: [
          {
            exercise: "Sentadilla",
            sets: 5,
            targetReps: "6",
            targetRir: "2",
            rest: "150 s",
            intensityTechnique: "Back-Off",
            sourceRow: 8,
          },
        ],
      },
    ]);
  });

  it("detects week numbers from a week column and recognizes English aliases", () => {
    const input = [
      "Week,Exercise,Sets,Target Reps,Target RIR,Rest,Intensity Technique",
      'Microciclo 6,"Peso muerto",3,5,2,"3 min",Myo-Reps',
      "2,Remo,4,10,3,90 sec,Drop Set",
    ].join("\n");

    expect(parseMicrocycleImport(input).map((cycle) => cycle.number)).toEqual([2, 6]);
    expect(parseMicrocycleImport(input)[1].exercises[0]).toMatchObject({
      exercise: "Peso muerto",
      sets: 3,
      intensityTechnique: "Myo-Reps",
    });
  });

  it("supports Markdown tables", () => {
    const input = [
      "Microciclo 3",
      "| Ejercicio | Series | Reps objetivo | RIR objetivo | Descanso | Técnica de Intensidad |",
      "| --- | --- | --- | --- | --- | --- |",
      "| Zancadas | 3 | 12 por lado | 2 | 60 s | Normal |",
    ].join("\n");

    expect(parseMicrocycleImport(input)[0].exercises[0]).toMatchObject({
      exercise: "Zancadas",
      targetReps: "12 por lado",
      intensityTechnique: null,
      sourceRow: 4,
    });
  });

  it("parses BOM-prefixed CRLF CSV with quoted delimiters and normalized headers", () => {
    const input = [
      "\uFEFFMicrociclo 1",
      "Exercise,Sets,Target Reps,Target RIR,Rest,Intensity Technique",
      '"Sentadilla, tempo",3,8,2,90 s,Normal',
    ].join("\r\n");

    expect(parseMicrocycleImport(input)[0].exercises[0]).toMatchObject({
      exercise: "Sentadilla, tempo",
      sets: 3,
      targetRir: "2",
      intensityTechnique: null,
      sourceRow: 3,
    });
  });

  it("supports semicolon-delimited files with quoted semicolons and decimal RIR ranges", () => {
    const input = [
      "Microciclo 4",
      "Ejercicio;Series;Reps objetivo;RIR objetivo;Descanso;Técnica de Intensidad",
      '"Peso muerto; rumano";4;6-8;2,5-3,5;120 s;Drop Set',
    ].join("\n");

    expect(parseMicrocycleImport(input)[0].exercises[0]).toMatchObject({
      exercise: "Peso muerto; rumano",
      targetReps: "6-8",
      targetRir: "2,5-3,5",
      intensityTechnique: "Drop Set",
    });
  });

  it("rejects unclosed quoted CSV fields with the original line number", () => {
    expect(() =>
      parseMicrocycleImport(
        [
          "Microciclo 1",
          "Ejercicio,Series,Reps objetivo,RIR objetivo,Descanso,Técnica de Intensidad",
          '"Sentadilla,4,8,2,90 s,',
        ].join("\n"),
      ),
    ).toThrow(
      expect.objectContaining({
        name: "MicrocycleImportError",
        details: ["Fila 3: el campo entre comillas no se cerró."],
      }),
    );
  });

  it("rejects a malformed target RIR value and identifies the source row", () => {
    expect(() =>
      parseMicrocycleImport(
        [
          "Microciclo 1",
          "Ejercicio\tSeries\tReps objetivo\tRIR objetivo\tDescanso\tTécnica de Intensidad",
          "Sentadilla\t4\t8\tcerca del fallo\t90 s\t",
        ].join("\n"),
      ),
    ).toThrow(
      expect.objectContaining({
        name: "MicrocycleImportError",
        details: [
          "Microciclo 1, fila 3: RIR objetivo debe ser un número o un rango numérico (por ejemplo, 2 o 2-3).",
        ],
      }),
    );
  });

  it("reports all missing mandatory headers", () => {
    expect(() =>
      parseMicrocycleImport(
        "Microciclo 1\nEjercicio\tSeries\tReps objetivo\tRIR objetivo\nSentadilla\t4\t8\t2",
      ),
    ).toThrow(
      expect.objectContaining({
        name: "MicrocycleImportError",
        details: expect.arrayContaining([
          expect.stringContaining("Descanso"),
          expect.stringContaining("Técnica de Intensidad"),
        ]),
      }),
    );
  });

  it("reports invalid exercise rows with their source line", () => {
    try {
      parseMicrocycleImport(
        [
          "Microciclo 1",
          "Ejercicio\tSeries\tReps objetivo\tRIR objetivo\tDescanso\tTécnica de Intensidad",
          "Sentadilla\t0\t8\t2\t90 s\t",
        ].join("\n"),
      );
      throw new Error("Expected the parser to reject the invalid series count.");
    } catch (error) {
      expect(error).toBeInstanceOf(MicrocycleImportError);
      expect((error as MicrocycleImportError).details).toContain(
        "Microciclo 1, fila 3: Series debe ser un entero entre 1 y 50.",
      );
    }
  });

  it("rejects microcycles outside the supported range", () => {
    try {
      parseMicrocycleImport(
        [
          "Microciclo 7",
          "Ejercicio\tSeries\tReps objetivo\tRIR objetivo\tDescanso\tTécnica de Intensidad",
        ].join("\n"),
      );
      throw new Error("Expected the parser to reject microcycle 7.");
    } catch (error) {
      expect(error).toBeInstanceOf(MicrocycleImportError);
      expect((error as MicrocycleImportError).details).toContain(
        "Fila con “Microciclo 7”: solo se admiten microciclos del 1 al 6.",
      );
    }
  });
});
