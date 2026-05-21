import { describe, it, expect } from "vitest";
import type { Registration } from "./types";

function generateCsv(registrations: Registration[]): string {
  const header = ["Nome", "E-mail", "Telefone", "Documento", "Presença", "Kit", "Data de inscrição"];
  const rows = registrations.map((r) => [
    r.name,
    r.email,
    r.phone ?? "",
    r.document ?? "",
    r.checkedIn ? "Sim" : "Não",
    r.kitDelivered ? "Sim" : "Não",
    new Date(r.createdAt).toLocaleString("pt-BR"),
  ]);
  return [header, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

const base: Registration = {
  id: "reg_1",
  eventId: "evt_1",
  name: "João Silva",
  email: "joao@example.com",
  phone: undefined,
  document: undefined,
  checkedIn: false,
  kitDelivered: false,
  drawn: false,
  lgpdAccepted: true,
  createdAt: "2026-05-21T10:00:00Z",
};

describe("generateCsv", () => {
  it("produces header row", () => {
    const csv = generateCsv([base]);
    const header = csv.split("\n")[0];
    expect(header).toContain('"Nome"');
    expect(header).toContain('"E-mail"');
    expect(header).toContain('"Presença"');
    expect(header).toContain('"Kit"');
    expect(header).toContain('"Data de inscrição"');
  });

  it("produces correct data row", () => {
    const csv = generateCsv([base]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"João Silva"');
    expect(lines[1]).toContain('"joao@example.com"');
    expect(lines[1]).toContain('"Não"');
  });

  it("marks checked-in and kit-delivered as Sim", () => {
    const reg = { ...base, checkedIn: true, kitDelivered: true };
    const csv = generateCsv([reg]);
    expect(csv).toContain('"Sim","Sim"');
  });

  it("includes phone and document when present", () => {
    const reg = { ...base, phone: "11999990000", document: "123.456.789-00" };
    const csv = generateCsv([reg]);
    expect(csv).toContain('"11999990000"');
    expect(csv).toContain('"123.456.789-00"');
  });

  it("escapes double quotes in values", () => {
    const reg = { ...base, name: 'Name with "quotes"' };
    const csv = generateCsv([reg]);
    expect(csv).toContain('"Name with ""quotes"""');
  });

  it("returns only header for empty list", () => {
    const csv = generateCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });

  it("uses comma as delimiter", () => {
    const csv = generateCsv([base]);
    const row = csv.split("\n")[1];
    expect(row.split(",").length).toBeGreaterThanOrEqual(7);
  });

  it("handles multiple registrations", () => {
    const reg2 = { ...base, id: "reg_2", name: "Maria", email: "maria@test.com" };
    const csv = generateCsv([base, reg2]);
    expect(csv.split("\n")).toHaveLength(3);
    expect(csv).toContain('"Maria"');
  });
});
