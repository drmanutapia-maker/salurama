import Image from 'next/image';
import { MapPin, Star, Calendar, Shield, Award } from 'lucide-react';

export type Doctor = {
  name: string;
  specialty: string;
  location: string;
  rating: number;
  reviews: number;
  image: string;
  verified: boolean;
  yearsExperience: number;
  price: number;
  highSpecialty?: boolean; // alta especialidad
};

export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-neutral-100">
      <div className="flex p-4 gap-4">
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0">
          <Image
            src={doctor.image}
            alt={doctor.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg text-neutral-900">{doctor.name}</h3>
              <p className="text-primary-600 text-sm">{doctor.specialty}</p>
              {doctor.highSpecialty && (
                <span className="inline-block text-xs bg-tertiary-100 text-tertiary-800 px-1.5 py-0.5 rounded mt-1">
                  Alta especialidad
                </span>
              )}
            </div>
            {doctor.verified && (
              <div className="bg-secondary-50 p-1 rounded-full" title="Cédula verificada">
                <Shield className="w-4 h-4 text-secondary-600" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-neutral-600">
            <MapPin className="w-3 h-3" />
            <span>{doctor.location}</span>
            <span className="w-1 h-1 bg-neutral-300 rounded-full" />
            <Calendar className="w-3 h-3" />
            <span>{doctor.yearsExperience} años exp.</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-sm">{doctor.rating}</span>
            <span className="text-neutral-500 text-sm">({doctor.reviews} reseñas)</span>
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="font-bold text-primary-600">${doctor.price}</span>
            <div className="flex gap-2">
              <a
                href={`https://www.gob.mx/cedulaprofesional?q=${encodeURIComponent(doctor.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded transition-colors"
              >
                Verificar SEP
              </a>
              <a
                href="#"
                className="text-xs bg-secondary-50 hover:bg-secondary-100 text-secondary-700 px-2 py-1 rounded transition-colors"
              >
                Certificación
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}