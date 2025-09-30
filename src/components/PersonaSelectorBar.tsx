import React from 'react';
import { Persona } from '../types';

interface PersonaSelectorBarProps {
  personas: Persona[];
  activePersonaId: string;
  onSelectPersona: (personaId: string) => void;
  isLoading: boolean;
}

const PersonaSelectorBar: React.FC<PersonaSelectorBarProps> = React.memo(({
  personas,
  activePersonaId,
  onSelectPersona,
  isLoading
}) => {
  return (
    <div
      className="glass mx-4 mt-4 rounded-xl py-3 px-3 sticky top-[80px] z-10"
      role="radiogroup"
      aria-label="Choose your AI Agent"
    >
      <div className="max-w-6xl mx-auto flex flex-wrap justify-center sm:justify-start gap-2 items-center">
        {personas.map((persona) => (
          <button
            key={persona.id}
            onClick={() => onSelectPersona(persona.id)}
            disabled={isLoading}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ease-in-out border-2 flex items-center space-x-2 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
              ${activePersonaId === persona.id
                ? `${persona.color.replace('bg-', 'border-').replace('-500', '-400')} bg-opacity-30 bg-assembly-green-dark text-assembly-green shadow-lg scale-105`
                : `bg-white bg-opacity-10 border-white border-opacity-20 text-gray-300 hover:border-white hover:border-opacity-40 hover:text-white hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            `}
            role="radio"
            aria-checked={activePersonaId === persona.id}
            aria-label={`Select ${persona.name.substring(persona.glyph.length).trim()} persona`}
          >
            <span className="text-lg sm:text-xl" aria-hidden="true">{persona.glyph}</span>
            <span className="hidden sm:inline">{persona.name.substring(persona.glyph.length).trim()}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

export default PersonaSelectorBar;
