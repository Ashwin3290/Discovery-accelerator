import { Inter } from 'next/font/google'
import './globals.css'
import Layout from '../components/Layout'
import { ThemeProvider } from '../context/ThemeContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Discovery Accelerator',
  description: 'A tool to streamline discovery processes for service-based companies',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <Layout>{children}</Layout>
        </ThemeProvider>
      </body>
    </html>
  )
}