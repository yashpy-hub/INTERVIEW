"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "./ui/button";

interface PerformanceReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  report: string;
}

const renderFormattedReport = (report: string) => {
  if (!report) return null;

  return report.split('\n').map((line, index) => {
    line = line.trim();
    if (line.startsWith('###') || line.startsWith('##') || line.startsWith('#')) {
      const level = (line.match(/#/g) || []).length;
      const text = line.replace(/#/g, '').trim();
      const Tag = `h${level + 2}` as keyof JSX.IntrinsicElements;
      return <Tag key={index} className="text-xl font-bold mt-4 mb-2">{text}</Tag>;
    }
    if (line.startsWith('* ') || line.startsWith('- ')) {
      return <li key={index} className="ml-6 list-disc">{line.substring(2)}</li>;
    }
    if(line.length > 0) {
        return <p key={index} className="mb-2 text-muted-foreground">{line}</p>;
    }
    return null;
  });
};

export function PerformanceReportDialog({
  isOpen,
  onOpenChange,
  report,
}: PerformanceReportDialogProps) {

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if(printWindow) {
      printWindow.document.write('<html><head><title>Performance Report</title>');
      printWindow.document.write('<style>body{font-family:sans-serif;line-height:1.6} h3{font-size:1.5em} h4{font-size:1.2em} ul{padding-left:20px}</style>');
      printWindow.document.write('</head><body>');
      const reportContent = document.getElementById('report-content')?.innerHTML;
      printWindow.document.write(reportContent || '');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Your Performance Report</DialogTitle>
          <DialogDescription>
            Here is a detailed analysis of your interview performance.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow">
            <div id="report-content" className="pr-6">
                {renderFormattedReport(report)}
            </div>
        </ScrollArea>
        <div className="pt-4 border-t">
          <Button onClick={handlePrint} className="w-full">Print Report</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
