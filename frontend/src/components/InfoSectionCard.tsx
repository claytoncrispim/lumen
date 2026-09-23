import type { ReactNode } from 'react';

interface InfoSectionCardProps {
    title: string;
    emoji: string;
    children: ReactNode;
}

const InfoSectionCard: React.FC<InfoSectionCardProps> = ({ title, emoji, children }) => {
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

export default InfoSectionCard;