import React, { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableHead, TableRow, Switch, TextField } from '@mui/material';
import { motion } from 'framer-motion';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { styled } from '@mui/system';
import './App.css'; // Assuming styles are defined here

// Turkish month names
const turkishMonths = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

// Styled TableCell components
const StyledTableCell = styled(TableCell)({ textAlign: 'center' });
const StyledTableHeadCell = styled(TableCell)({ textAlign: 'center' });

const SalaryRise = () => {
  // State variables
  const [data, setData] = useState([]);           // Parsed CSV data
  const [latestDate, setLatestDate] = useState(''); // Latest date formatted
  const [guaranteedRise, setGuaranteedRise] = useState('0'); // Guaranteed rise percentage as string
  const [totalChange, setTotalChange] = useState('0');       // Total CPI change percentage as string
  const [loading, setLoading] = useState(true);   // Loading state
  const [error, setError] = useState(null);       // Error state
  const [darkMode, setDarkMode] = useState(false); // Dark mode state
  const [grossSalary, setGrossSalary] = useState(''); // User's gross salary input
  const [salaryChange, setSalaryChange] = useState(0); // Calculated salary change
  const [newSalary, setNewSalary] = useState(0); // Calculated new salary

  // Toggle dark mode
  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Create theme based on dark mode
  const theme = useMemo(
    () => createTheme({ palette: { mode: darkMode ? 'dark' : 'light' } }),
    [darkMode]
  );

  // Fetch and parse CSV data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/cpi_data.csv');
        if (!response.ok) throw new Error('Veri yüklenirken hata oluştu');
        const csvText = await response.text();

        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            const parsedData = results.data
              .filter(row => row.Date && row.CPI && !isNaN(parseFloat(row.CPI)))
              .map(row => {
                const [day, month, year] = row.Date.split('/');
                return {
                  year: parseInt(year, 10),
                  month: parseInt(month, 10),
                  index: parseFloat(row.CPI),
                  percentChange: 'N/A' // Default for first row
                };
              })
              .sort((a, b) => a.year - b.year || a.month - b.month);

            // Calculate monthly percentage changes
            for (let i = 1; i < parsedData.length; i++) {
              const prev = parsedData[i - 1].index;
              const current = parsedData[i].index;
              if (!isNaN(prev) && !isNaN(current) && prev !== 0) {
                const change = (current - prev) / prev * 100;
                parsedData[i].percentChange = change.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              }
            }

            setData(parsedData);
            setLoading(false);
          },
          error: (parseError) => {
            console.error('CSV ayrıştırma hatası:', parseError);
            setError('Veri yüklenirken hata oluştu');
            setLoading(false);
          }
        });
      } catch (fetchError) {
        console.error('CSV yükleme hatası:', fetchError);
        setError('Veri yüklenirken hata oluştu');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate rises when data changes
  useEffect(() => {
    if (data.length === 0) return;

    const latest = data[data.length - 1];
    const latestYear = latest.year;
    const latestMonth = latest.month;
    const latestIndex = latest.index;

    const janEntry = data.find(d => d.year === latestYear && d.month === 1);
    if (!janEntry) {
      setError('Son yıl için Ocak verisi bulunamadı');
      return;
    }

    let guaranteedRiseValue;
    if (latestMonth <= 6) {
      guaranteedRiseValue = ((latestIndex / janEntry.index - 1) * 100);
    } else {
      const junEntry = data.find(d => d.year === latestYear && d.month === 6);
      if (!junEntry) {
        setError('Son yıl için Haziran verisi bulunamadı');
        return;
      }
      const janToLatestChange = (latestIndex / janEntry.index - 1);
      const janToJunChange = (junEntry.index / janEntry.index - 1);
      guaranteedRiseValue = ((janToLatestChange - janToJunChange) * 100);
    }

    const totalChangeValue = ((latestIndex / janEntry.index - 1) * 100);

    // Format with Turkish locale
    setGuaranteedRise(guaranteedRiseValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setTotalChange(totalChangeValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setLatestDate(`${turkishMonths[latestMonth - 1]} ${latestYear}`);
  }, [data]);

  // Handle gross salary input change
  const handleGrossSalaryChange = (event) => {
    const value = event.target.value;
    setGrossSalary(value);

    const rise = parseFloat(guaranteedRise.replace(',', '.')); // Convert string to number
    if (!isNaN(parseFloat(value)) && !isNaN(rise)) {
      const salaryChangeValue = (parseFloat(value) * rise / 100);
      setSalaryChange(salaryChangeValue);
      setNewSalary(parseFloat(value) + salaryChangeValue);
    } else {
      setSalaryChange(0);
      setNewSalary(0);
    }
  };

  // Format numbers with Turkish locale
  const formatNumber = (number) =>
    number.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Render UI
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="container">
        <Card elevation={3}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Kuzey Kıbrıs Maaş Artışı Hesaplayıcı
            </Typography>
            <Switch checked={darkMode} onChange={toggleDarkMode} />
            {loading ? (
              <Typography variant="body1">Veriler yükleniyor...</Typography>
            ) : error ? (
              <Typography variant="body1" color="error">{error}</Typography>
            ) : (
              <>
                <Typography variant="subtitle1" color="textSecondary">
                  Son Veri: {latestDate}
                </Typography>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <Typography variant="h6" color="primary">
                    Garantili Artış: {guaranteedRise}%
                  </Typography>
                  <Typography variant="h6" color="secondary">
                    Ocak Ayından İtibaren Toplam TÜFE Değişimi: {totalChange}%
                  </Typography>
                </motion.div>

                <TextField
                  label="Brüt Maaşınızı Giriniz"
                  variant="outlined"
                  type="number"
                  value={grossSalary}
                  onChange={handleGrossSalaryChange}
                  style={{ marginTop: '20px', marginBottom: '20px' }}
                />

                <Typography variant="h6" color="success">
                  Yaklaşık Maaş Artışı: {formatNumber(salaryChange)} TL
                </Typography>
                <Typography variant="h6" color="success">
                  Yaklaşık Yeni Maaşınız: {formatNumber(newSalary)} TL
                </Typography>

                <Typography variant="h6" style={{ marginTop: '20px' }}>
                  Aylık Veriler
                </Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <StyledTableHeadCell>Tarih</StyledTableHeadCell>
                      <StyledTableHeadCell>Aylık % Değişim</StyledTableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...data].reverse().map((row, index) => (
                      <TableRow key={index}>
                        <StyledTableCell>{`${turkishMonths[row.month - 1]} ${row.year}`}</StyledTableCell>
                        <StyledTableCell>{row.percentChange !== 'N/A' ? `${row.percentChange}%` : 'N/A'}</StyledTableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ThemeProvider>
  );
};

export default SalaryRise;