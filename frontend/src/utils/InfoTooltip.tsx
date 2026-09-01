interface InfoTooltipProps {
    label: string;
    children: string;
}
export const InfoTooltip = ({ label, children }: InfoTooltipProps) => {
    return (
        <div className="TODO-style-info-tooltip">
            <button
                type="button"
                className="TODO-style-info-tooltip-button"
                aria-label={label}
            >
                i
            </button>
            <div className="TODO-style-info-tooltip-children">
                {children}
            </div>
        </div>
    );
};