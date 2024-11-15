import React from 'react';
import { Paper, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, TablePagination } from '@mui/material';

interface TradeData {
  date: string;
  security_title: string;
  transaction_code: string;
  shares: string;
  price_per_share: string;
  ownership_type: string;
}

interface DataTableProps {
  tradeData: TradeData[];
  rowsPerPage: number;
  page: number;
  handleChangePage: (event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const DataTable: React.FC<DataTableProps> = ({ tradeData, rowsPerPage, page, handleChangePage, handleChangeRowsPerPage }) => {
  const visibleRows = tradeData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  return (
    <Paper elevation={3} sx={{ padding: '1rem', width: '100%', maxWidth: '1200px', marginTop: '2rem', backgroundColor: '#F8FAFC', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)' }}>
      <Typography variant="h5" align="center" fontWeight="bold" color="primary" gutterBottom>
        Insider Trade Information
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Security Title</TableCell>
              <TableCell>Transaction Code</TableCell>
              <TableCell>Shares</TableCell>
              <TableCell>Price Per Share</TableCell>
              <TableCell>Ownership Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((trade, index) => (
              <TableRow key={index} hover>
                <TableCell>{trade.date}</TableCell>
                <TableCell>{trade.security_title}</TableCell>
                <TableCell>{trade.transaction_code}</TableCell>
                <TableCell>{trade.shares}</TableCell>
                <TableCell>{trade.price_per_share}</TableCell>
                <TableCell>{trade.ownership_type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 20]}
          component="div"
          count={tradeData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Paper>
  );
};

export default DataTable;
