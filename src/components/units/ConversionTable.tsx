import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import convert from "convert-units";

export default function ConversionTable({ fromLabel, toLabel, fromUnit, toUnit }: { fromLabel: string; toLabel: string; fromUnit: string; toUnit: string }) {
  const samples = [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 1000];
  const rows = samples.map((v) => {
    let out = "";
    try { out = String(convert(v).from(fromUnit).to(toUnit)); } catch { out = ""; }
    return { v, out };
  });
  const mid = Math.ceil(rows.length / 2);
  const rowsA = rows.slice(0, mid);
  const rowsB = rows.slice(mid);
  return (
      <Card>
        <CardHeader>
          <CardTitle>{fromLabel}换算{toLabel}</CardTitle>
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