// DUEÑA: B — Prueba unitaria de la función de bloques (función pura, sin BD ni Redis)
import { describe, expect, it } from 'vitest';
import { esFechaValida, fechaLocal, generarBloques } from '../../src/servicios/servicioDisponibilidad';

describe('generarBloques', () => {
  it('genera un bloque de 60 min por hora entre apertura y cierre', () => {
    const bloques = generarBloques('2030-01-15', 7, 21, []);
    expect(bloques).toHaveLength(14);
    expect(bloques[0]).toEqual({ inicio: '2030-01-15T13:00:00.000Z', fin: '2030-01-15T14:00:00.000Z', estado: 'libre' });
    expect(bloques.at(-1)?.fin).toBe('2030-01-16T03:00:00.000Z'); // 21:00 en Guatemala
  });

  it('marca como ocupados los bloques que se traslapan con una reserva', () => {
    const reservas = [{ inicio: new Date('2030-01-15T08:00:00-06:00'), fin: new Date('2030-01-15T10:00:00-06:00') }];
    const estados = generarBloques('2030-01-15', 7, 12, reservas).map((b) => b.estado);
    expect(estados).toEqual(['libre', 'ocupado', 'ocupado', 'libre', 'libre']); // 7,8,9,10,11
  });

  it('una reserva parcial (08:30–09:15) ocupa los dos bloques que toca', () => {
    const reservas = [{ inicio: new Date('2030-01-15T08:30:00-06:00'), fin: new Date('2030-01-15T09:15:00-06:00') }];
    const estados = generarBloques('2030-01-15', 8, 11, reservas).map((b) => b.estado);
    expect(estados).toEqual(['ocupado', 'ocupado', 'libre']);
  });

  it('una reserva que termina justo al empezar el bloque no lo ocupa', () => {
    const reservas = [{ inicio: new Date('2030-01-15T07:00:00-06:00'), fin: new Date('2030-01-15T08:00:00-06:00') }];
    const estados = generarBloques('2030-01-15', 7, 9, reservas).map((b) => b.estado);
    expect(estados).toEqual(['ocupado', 'libre']);
  });

  it('acepta cierre a las 24', () => {
    const bloques = generarBloques('2030-01-15', 22, 24, []);
    expect(bloques).toHaveLength(2);
    expect(bloques[1].fin).toBe('2030-01-16T06:00:00.000Z');
  });
});

describe('utilidades de fecha', () => {
  it('fechaLocal usa la hora de Guatemala', () => {
    expect(fechaLocal(new Date('2030-01-16T03:00:00Z'))).toBe('2030-01-15'); // 21:00 del 15 en Guatemala
  });

  it('esFechaValida rechaza fechas que no existen', () => {
    expect(esFechaValida('2030-01-15')).toBe(true);
    expect(esFechaValida('2030-02-31')).toBe(false);
    expect(esFechaValida('2030-13-01')).toBe(false);
  });
});
