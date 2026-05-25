import { FormsScreenShell } from "../screen-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const archivedItems = [
  {
    name: "Partner Application",
    type: "Form",
    owner: "Sales",
    responses: 18,
    archivedOn: "May 12",
  },
  {
    name: "Q1 Feedback Pulse",
    type: "Form",
    owner: "People",
    responses: 42,
    archivedOn: "May 08",
  },
  {
    name: "Legacy Event Registration",
    type: "Template",
    owner: "Marketing",
    responses: 0,
    archivedOn: "Apr 30",
  },
];

export function ArchivedScreen() {
  return (
    <FormsScreenShell
      eyebrow="Archive"
      title="Archived"
      description="Review forms and templates that are no longer active in the workspace."
    >
      <section className="overflow-hidden rounded-md border border-[#2a2a2a] bg-[#1a1a1a]">
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Responses</TableHead>
              <TableHead>Archived on</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {archivedItems.map((item) => (
              <TableRow key={item.name} className="bg-[#1a1a1a] text-[#d4d4d4]">
                <TableCell className="font-medium text-[#f5f5f5]">{item.name}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.owner}</TableCell>
                <TableCell className="text-right tabular-nums">{item.responses}</TableCell>
                <TableCell>{item.archivedOn}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </FormsScreenShell>
  );
}
