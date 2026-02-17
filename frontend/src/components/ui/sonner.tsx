import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  // Read the theme class from <html> element
  const theme = typeof document !== 'undefined'
    ? (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    : 'dark';

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:bg-emerald-500/10 group-[.toaster]:text-emerald-400 group-[.toaster]:border-emerald-500/20",
          error:
            "group-[.toaster]:bg-red-500/10 group-[.toaster]:text-red-400 group-[.toaster]:border-red-500/20",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
