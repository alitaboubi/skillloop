import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          // Card surface, raised; status is an inline-start edge plus sonner's own icon and text — never colour alone.
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-raised group-[.toaster]:rounded-2xl",
          success: "group-[.toaster]:border-s-4 group-[.toaster]:border-s-success",
          error: "group-[.toaster]:border-s-4 group-[.toaster]:border-s-destructive",
          warning: "group-[.toaster]:border-s-4 group-[.toaster]:border-s-warning",
          info: "group-[.toaster]:border-s-4 group-[.toaster]:border-s-sea",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-semibold",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
