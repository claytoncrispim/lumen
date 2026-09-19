interface FormatDateProps {
    dateString?: string; // The date string to be formatted (optional)
}

const formatDate = ({ dateString }: FormatDateProps): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
};

export default formatDate;