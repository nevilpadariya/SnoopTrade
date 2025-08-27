import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  styled,
} from '@mui/material';

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
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 600,
  backgroundColor: 'rgba(115, 194, 160, 0.2)',
  color: '#FFFFFF',
  textAlign: 'center',
  padding: '16px',
  fontSize: '0.95rem',
  borderBottom: '1px solid rgba(115, 194, 160, 0.1)',
}));

const StyledTableRow = styled(TableRow)(() => ({
  '&:nth-of-type(odd)': {
    backgroundColor: 'rgba(115, 194, 160, 0.05)',
  },
  '&:nth-of-type(even)': {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  '&:hover': {
    backgroundColor: 'rgba(115, 194, 160, 0.1)',
    transition: 'background-color 0.2s ease',
  },
}));

const StyledTableBodyCell = styled(TableCell)(() => ({
  color: 'rgba(255, 255, 255, 0.8)',
  textAlign: 'center',
  padding: '16px',
  borderBottom: '1px solid rgba(115, 194, 160, 0.1)',
}));

const StyledTableContainer = styled(TableContainer)(() => ({
  backgroundColor: 'transparent',
  '& .MuiTablePagination-root': {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  '& .MuiTablePagination-selectIcon': {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  '& .MuiTablePagination-select': {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  '& .MuiTablePagination-selectLabel': {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  '& .MuiTablePagination-displayedRows': {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  '& .MuiIconButton-root.Mui-disabled': {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  '& .MuiIconButton-root': {
    color: 'rgba(255, 255, 255, 0.8)',
  },
}));

const DataTable: React.FC<DataTableProps> = ({
  tradeData,
  rowsPerPage,
  page,
  handleChangePage,
  handleChangeRowsPerPage,
}) => {
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: string) => {
    const isAsc = sortColumn === column && sortDirection === 'asc';
    setSortColumn(column);
    setSortDirection(isAsc ? 'desc' : 'asc');
  };

  // Filter out invalid dates and dates in the future
  const filteredData = tradeData.filter((row) => {
    const date = new Date(row.date);
    const currentDate = new Date();
    return (
      !isNaN(date.getTime()) && // Check if date is valid
      date <= currentDate && // Ensure date is not in the future
      row.date !== null && // Ensure date is not null
      row.date !== undefined // Ensure date is not undefined
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

  return (
    <StyledTableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <StyledTableCell>
              <TableSortLabel
                active={sortColumn === 'date'}
                direction={sortDirection}
                onClick={() => handleSort('date')}
              >
                Date
              </TableSortLabel>
            </StyledTableCell>
            <StyledTableCell>
              <TableSortLabel
                active={sortColumn === 'transaction_code'}
                direction={sortDirection}
                onClick={() => handleSort('transaction_code')}
              >
                Transaction Type
              </TableSortLabel>
            </StyledTableCell>
            <StyledTableCell>
              <TableSortLabel
                active={sortColumn === 'shares'}
                direction={sortDirection}
                onClick={() => handleSort('shares')}
              >
                Shares
              </TableSortLabel>
            </StyledTableCell>
            <StyledTableCell>
              <TableSortLabel
                active={sortColumn === 'price_per_share'}
                direction={sortDirection}
                onClick={() => handleSort('price_per_share')}
              >
                Price Per Share
              </TableSortLabel>
            </StyledTableCell>
            <StyledTableCell>
              <TableSortLabel
                active={sortColumn === 'total_value'}
                direction={sortDirection}
                onClick={() => handleSort('total_value')}
              >
                Total Value
              </TableSortLabel>
            </StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedData.length > 0 ? (
            paginatedData.map((row, index) => (
              <StyledTableRow key={index}>
                <StyledTableBodyCell>{formatDate(row.date)}</StyledTableBodyCell>
                <StyledTableBodyCell>
                  {getTransactionType(row.transaction_code)}
                </StyledTableBodyCell>
                <StyledTableBodyCell>
                  {row.shares?.toLocaleString() || 'N/A'}
                </StyledTableBodyCell>
                <StyledTableBodyCell>
                  $
                  {row.price_per_share?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || 'N/A'}
                </StyledTableBodyCell>
                <StyledTableBodyCell>
                  $
                  {(
                    row.shares * (row.price_per_share || 0)
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </StyledTableBodyCell>
              </StyledTableRow>
            ))
          ) : (
            <StyledTableRow>
              <StyledTableBodyCell colSpan={5}>
                No transaction data available.
              </StyledTableBodyCell>
            </StyledTableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </StyledTableContainer>
  );
};

export default DataTable;
