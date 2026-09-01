interface FormatDateProps {
    dateString: string;
}

const formatDate = ({ dateString }: FormatDateProps): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
};

export default formatDate;