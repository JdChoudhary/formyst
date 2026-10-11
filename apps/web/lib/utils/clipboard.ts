import { toast } from "@/hooks/use-toast";

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

export async function copyWithToast(
  text: string,
  successMessage = "Copied to clipboard",
  errorMessage = "Failed to copy to clipboard",
): Promise<boolean> {
  const copied = await copyToClipboard(text);
  if (copied) {
    toast.success(successMessage);
  } else {
    toast.error(errorMessage);
  }
  return copied;
}
