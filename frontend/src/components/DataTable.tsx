import { useState, ChangeEvent } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

interface TradeData {
  date: string;
  shares: number;
  transaction_code: string;
  price_per_share: number;
}

interface DataTableProps {
  tradeData: TradeData[];
  rowsPerPage: number;
  page: number;
  handleChangePage: (event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: ChangeEvent<HTMLInputElement>) => void;
}

const DataTable = ({
  tradeData,
  rowsPerPage,
  page,
  handleChangePage,
  handleChangeRowsPerPage,
}: DataTableProps) => {
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: string) => {
    const isAsc = sortColumn === column && sortDirection === 'asc';
    setSortColumn(column);
    setSortDirection(isAsc ? 'desc' : 'asc');
  };

  const filteredData = tradeData.filter((row) => {
    const date = new Date(row.date);
    const currentDate = new Date();
    return (
      !isNaN(date.getTime()) &&
      date <= currentDate &&
      row.date !== null &&
      row.date !== undefined
    );
  });

  const getTransactionType = (code: string) => {
    const types: { [key: string]: string } = {
      P: 'Purchase',
      S: 'Sale',
      A: 'Grant',
      D: 'Sale to Loss',
      F: 'Payment of Exercise',
      I: 'Discretionary Transaction',
      M: 'Exercise/Conversion',
    };
    return types[code] || code;
  };

  const getTransactionBadgeVariant = (code: string): "purchase" | "sale" | "grant" | "exercise" | "payment" | "discretionary" | "gift" | "neutral" => {
    const variantMap: { [key: string]: "purchase" | "sale" | "grant" | "exercise" | "payment" | "discretionary" | "gift" | "neutral" } = {
      P: 'purchase',
      S: 'sale',
      A: 'grant',
      D: 'neutral',
      F: 'payment',
      I: 'discretionary',
      M: 'exercise',
      G: 'gift',
    };
    return variantMap[code] || 'neutral';
  };

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortColumn === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortColumn === 'shares') {
      return sortDirection === 'asc' ? a.shares - b.shares : b.shares - a.shares;
    } else if (sortColumn === 'price_per_share') {
      return sortDirection === 'asc'
        ? a.price_per_share - b.price_per_share
        : b.price_per_share - a.price_per_share;
    } else if (sortColumn === 'transaction_code') {
      const typeA = getTransactionType(a.transaction_code);
      const typeB = getTransactionType(b.transaction_code);
      return sortDirection === 'asc'
        ? typeA.localeCompare(typeB)
        : typeB.localeCompare(typeA);
    } else if (sortColumn === 'total_value') {
      const totalA = a.shares * (a.price_per_share || 0);
      const totalB = b.shares * (b.price_per_share || 0);
      return sortDirection === 'asc' ? totalA - totalB : totalB - totalA;
    }
    return 0;
  });

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatDate = (dateString: string) => {
    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid Date';
    }
    return parsedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <Card className="w-full bg-card/80 backdrop-blur-sm border-border/50 shadow-lg">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold text-card-foreground font-display">
          Insider Transaction History
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Detailed breakdown of all insider trading transactions
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/30 hover:bg-transparent">
                <TableHead className="text-card-foreground font-semibold">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    Date
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </TableHead>
                <TableHead className="text-card-foreground font-semibold">
                  <button
                    onClick={() => handleSort('transaction_code')}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    Type
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </TableHead>
                <TableHead className="text-right text-card-foreground font-semibold">
                  <button
                    onClick={() => handleSort('shares')}
                    className="flex items-center gap-2 ml-auto hover:text-primary transition-colors"
                  >
                    Shares
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </TableHead>
                <TableHead className="text-right text-card-foreground font-semibold hidden sm:table-cell">
                  <button
                    onClick={() => handleSort('price_per_share')}
                    className="flex items-center gap-2 ml-auto hover:text-primary transition-colors"
                  >
                    Price/Share
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </TableHead>
                <TableHead className="text-right text-card-foreground font-semibold">
                  <button
                    onClick={() => handleSort('total_value')}
                    className="flex items-center gap-2 ml-auto hover:text-primary transition-colors"
                  >
                    Total Value
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, index) => (
                  <TableRow
                    key={index}
                    className="border-b border-border/20 hover:bg-primary/5 transition-colors"
                  >
                    <TableCell className="font-medium text-card-foreground/90">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTransactionBadgeVariant(row.transaction_code)}>
                        {getTransactionType(row.transaction_code)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-card-foreground/80 font-mono">
                      {row.shares?.toLocaleString() || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right text-card-foreground/80 font-mono hidden sm:table-cell">
                      $
                      {row.price_per_share?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary-strong font-mono">
                      $
                      {(
                        row.shares * (row.price_per_share || 0)
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    No transaction data available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <Select
              value={String(rowsPerPage)}
              onValueChange={(val) => {
                const syntheticEvent = {
                  target: { value: val }
                } as React.ChangeEvent<HTMLInputElement>;
                handleChangeRowsPerPage(syntheticEvent);
              }}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 25, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages || 1} ({filteredData.length} total)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleChangePage(e, 0)}
                disabled={page === 0}
                className="h-8 w-8 text-card-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleChangePage(e, page - 1)}
                disabled={page === 0}
                className="h-8 w-8 text-card-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleChangePage(e, page + 1)}
                disabled={page >= totalPages - 1}
                className="h-8 w-8 text-card-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleChangePage(e, totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="h-8 w-8 text-card-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataTable;
