# GEVI Page Curator Memory

## Key Finding: DOI Issue with ASAP5

The provided DOI (10.1016/j.neuron.2024.07.013) was incorrect - it pointed to a completely different paper about SLC20A2 (Antisense oligonucleotides enhance SLC20A2 expression).

The correct ASAP5 paper:
- **Title**: "A fast and responsive voltage indicator with enhanced sensitivity for unitary synaptic events"
- **Journal**: Neuron
- **Correct DOI**: 10.1016/j.neuron.2024.08.019
- **Year**: 2024

## Common Data Fields for GEVI Pages

Based on existing entries, useful fields to add:
- `spectra`: excitation/emission wavelengths, filter specifications
- `kinetics`: activation/deactivation time constants at different temperatures
- `dynamicRangeData`: deltaF/F, voltage sensitivity in %/mV
- `applicationNotes`: specific use cases and performance notes

## ASAP5 Technical Specifications (from paper)

- **Excitation**: 470 nm LED, 482/18 nm bandpass filter
- **Emission**: 525/50 nm bandpass filter
- **Peak wavelengths**: ~500 nm excitation, ~515 nm emission
- **Activation time constant**: 2.61 ms (room temp), 0.78 ms (37C)
- **Deactivation time constant**: 4.30 ms (room temp), 1.12 ms (37C)
- **Fractional fast component**: 92% (room temp), 95% (37C)
- **Voltage sensitivity**: -0.83%/mV
- **DeltaF/F**: -51% per 100mV

## Lessons Learned

- Always verify DOI links when provided - they may be incorrect
- Search for papers using author names (e.g., Piatkevich) if DOI fails
- PMC (PubMed Central) is a good backup source for paper content
