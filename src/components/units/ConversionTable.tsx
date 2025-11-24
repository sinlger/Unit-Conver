import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import convert from "convert-units";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";

export default function ConversionTable({ fromLabel, toLabel, fromUnit, toUnit, locale }: { fromLabel: string; toLabel: string; fromUnit: string; toUnit: string; locale?: string }) {
  const samples = [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 1000];
  const rows = samples.map((v) => {
    let out = "";
    try { out = String(convert(v).from(fromUnit).to(toUnit)); } catch { out = ""; }
    return { v, out };
  });
  const mid = Math.ceil(rows.length / 2);
  const rowsA = rows.slice(0, mid);
  const rowsB = rows.slice(mid);
  const m: any = locale === "en" ? en : zh;
  const title = (m.conversion?.tableTitleJoin || "{from} 换算 {to}").replace("{from}", String(fromLabel)).replace("{to}", String(toLabel));
  return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
              <Table className="border border-border rounded-md [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border">
                <TableHeader>
                  <TableRow>
                    <TableHead>{fromLabel}</TableHead>
                    <TableHead>{toLabel}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsA.map((r) => (
                    <TableRow key={String(r.v)}>
                      <TableCell>{String(r.v)} {fromUnit}</TableCell>
                      <TableCell>{r.out ? `${r.out} ${toUnit}` : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Table className="border border-border rounded-md [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border">
                <TableHeader>
                  <TableRow>
                    <TableHead>{fromLabel}</TableHead>
                    <TableHead>{toLabel}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsB.map((r) => (
                    <TableRow key={`dup-${String(r.v)}`}>
                      <TableCell>{String(r.v)} {fromUnit}</TableCell>
                      <TableCell>{r.out ? `${r.out} ${toUnit}` : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </div>
        </CardContent>
      </Card>
  );
}
