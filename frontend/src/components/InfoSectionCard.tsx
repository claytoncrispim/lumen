interface InfoSectionCardProps {
    title: string;
    emoji: string;
    children: string;
}

export const InfoSectionCard = ({ title, emoji, children }: InfoSectionCardProps) => {
    return (
        <section className="TODO-style-info-section-card">
            <header className="TODO-style-info-section-card-header">
                <span className="TODO-style-info-section-card-emoji">{emoji}</span>
                <h3 className="TODO-style-info-section-card-title">{title}</h3>
            </header>
            <div className="TODO-style-info-section-card-children">{children}</div>
        </section>
    );
};