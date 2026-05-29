import { createSignal, createEffect, onMount, onCleanup, Show, type JSX } from 'solid-js'
import { Button } from './components/ui/button'
import { cn } from './lib/utils'

declare global {
  interface Window {
    $3Dmol: {
      createViewer: (el: HTMLElement, opts: object) => {
        addModel: (data: string, fmt: string) => void
        removeAllModels: () => void
        setStyle: (sel: object, style: object) => void
        zoomTo: () => void
        render: () => void
        clear: () => void
      }
    }
  }
}

interface MoleculeData {
  smiles: string
  formula: string
  molecular_weight: number
  num_heavy_atoms: number
  num_bonds: number
  num_rings: number
  num_rotatable_bonds: number
  num_hbd: number
  num_hba: number
  logp: number
  tpsa: number
  svg: string
  sdf_3d: string
}

function SectionHeader(props: { label: string }) {
  return (
    <div class="mt-4 border-t border-gray-100 pt-3">
      <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {props.label}
      </span>
    </div>
  )
}

function PropRow(props: {
  label: string
  value: string | number
  description?: string
  unit?: string
  badge?: { pass: boolean; rule: string }
}) {
  return (
    <div class="flex items-start justify-between gap-4 py-1.5">
      <div class="min-w-0">
        <p class="text-sm font-medium text-gray-700">{props.label}</p>
        <Show when={props.description}>
          <p class="text-xs text-gray-400">{props.description}</p>
        </Show>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <span class="font-mono text-sm text-gray-900">{props.value}</span>
        <Show when={props.unit}>
          <span class="text-xs text-gray-400">{props.unit}</span>
        </Show>
        <Show when={props.badge}>
          {(b) => (
            <span
              class={cn(
                'rounded px-1.5 py-0.5 text-xs font-medium',
                b().pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
              )}
            >
              {b().pass ? '✓' : '✗'} {b().rule}
            </span>
          )}
        </Show>
      </div>
    </div>
  )
}

function responsiveSvg(svg: string): string {
  return svg
    .replace(/width='400px'/, "width='100%'")
    .replace(/height='300px'/, "height='auto'")
}

function Viewer3D(props: { sdf: string }) {
  let el!: HTMLDivElement
  let viewer: ReturnType<Window['$3Dmol']['createViewer']> | null = null

  const load = (sdf: string) => {
    if (!viewer || !sdf) return
    viewer.removeAllModels()
    viewer.addModel(sdf, 'sdf')
    viewer.setStyle(
      {},
      {
        stick: { radius: 0.12, colorscheme: 'Jmol' },
        sphere: { radius: 0.28, colorscheme: 'Jmol' },
      },
    )
    viewer.zoomTo()
    viewer.render()
  }

  onMount(() => {
    viewer = window.$3Dmol?.createViewer(el, { backgroundColor: 'white' })
    load(props.sdf)
  })

  // Re-render when sdf prop changes (e.g. new molecule analyzed)
  createEffect(() => load(props.sdf))

  onCleanup(() => viewer?.clear())

  return <div ref={el} style={{ width: '100%', height: '100%', position: 'absolute', inset: '0' }} />
}

export default function App() {
  const [smiles, setSmiles] = createSignal('')
  const [data, setData] = createSignal<MoleculeData | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const analyze = async () => {
    const s = smiles().trim()
    if (!s) return
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/molecule?smiles=${encodeURIComponent(s)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail ?? 'Request failed')
      setData(json as MoleculeData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch molecule')
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = (e) => {
    if (e.key === 'Enter') analyze()
  }

  return (
    <div class="min-h-screen bg-gray-50 p-8">
      <div class="mx-auto max-w-6xl">

        {/* Header */}
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Molecule Viewer</h1>
          <p class="mt-1 text-sm text-gray-500">
            Analyze molecular structure and properties from a SMILES string
          </p>
        </div>

        {/* Input row */}
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-700">Enter SMILES</label>
          <div class="flex gap-2">
            <input
              type="text"
              value={smiles()}
              onInput={(e) => setSmiles(e.currentTarget.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. Cc1ccccc1  or  CC(=O)Oc1ccccc1C(=O)O"
              class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button onClick={analyze} disabled={loading() || smiles().trim() === ''}>
              {loading() ? 'Analyzing…' : 'Analyze Molecule'}
            </Button>
          </div>
        </div>

        {/* Error */}
        <Show when={error()}>
          <div class="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p class="text-sm font-medium text-red-700">Error</p>
            <p class="mt-0.5 text-sm text-red-600">{error()}</p>
          </div>
        </Show>

        {/* Results */}
        <Show when={data()}>
          {(mol) => (
            <div class="mt-8 flex flex-col gap-6">

              {/* Row 1 — 2D structure + Properties side by side */}
              <div class="grid grid-cols-2 gap-6 items-start">

                {/* LEFT — 2D SVG */}
                <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 class="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    2D Structure
                  </h2>
                  <div class="w-full" innerHTML={responsiveSvg(mol().svg)} />
                  <div class="mt-3 border-t border-gray-100 pt-3 flex items-center justify-between">
                    <div>
                      <p class="text-xs text-gray-400">Molecular Formula</p>
                      <p class="text-base font-semibold text-gray-800">{mol().formula}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-xs text-gray-400">Molecular Weight</p>
                      <p class="text-base font-semibold text-gray-800">
                        {mol().molecular_weight.toFixed(4)}{' '}
                        <span class="text-sm font-normal text-gray-400">Da</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* RIGHT — Properties */}
                <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 class="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Properties
                  </h2>

                  <div class="mt-3">
                    <p class="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">
                      Canonical SMILES
                    </p>
                    <p class="break-all rounded bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">
                      {mol().smiles}
                    </p>
                  </div>

                  <SectionHeader label="Physical Properties" />
                  <PropRow
                    label="Molecular Weight"
                    value={mol().molecular_weight.toFixed(4)}
                    unit="Da"
                    description="Exact monoisotopic mass"
                    badge={{ pass: mol().molecular_weight <= 500, rule: '≤ 500 Da' }}
                  />
                  <PropRow
                    label="LogP"
                    value={mol().logp.toFixed(4)}
                    description="Lipophilicity — higher = more lipophilic"
                    badge={{ pass: mol().logp <= 5, rule: '≤ 5' }}
                  />
                  <PropRow
                    label="TPSA"
                    value={mol().tpsa.toFixed(4)}
                    unit="Å²"
                    description="Topological polar surface area — membrane permeability predictor"
                  />

                  <SectionHeader label="Structural Features" />
                  <PropRow
                    label="Heavy Atoms"
                    value={mol().num_heavy_atoms}
                    description="Non-hydrogen atom count"
                  />
                  <PropRow
                    label="Total Bonds"
                    value={mol().num_bonds}
                    description="All chemical bonds in the molecule"
                  />
                  <PropRow
                    label="Ring Count"
                    value={mol().num_rings}
                    description="Number of ring systems"
                  />
                  <PropRow
                    label="Rotatable Bonds"
                    value={mol().num_rotatable_bonds}
                    description="Measure of molecular flexibility"
                  />

                  <SectionHeader label="Drug-likeness  (Lipinski's Rule of 5)" />
                  <PropRow
                    label="H-Bond Donors"
                    value={mol().num_hbd}
                    description="NH and OH groups"
                    badge={{ pass: mol().num_hbd <= 5, rule: '≤ 5' }}
                  />
                  <PropRow
                    label="H-Bond Acceptors"
                    value={mol().num_hba}
                    description="N and O atoms"
                    badge={{ pass: mol().num_hba <= 10, rule: '≤ 10' }}
                  />
                </div>
              </div>

              {/* Row 2 — 3D viewer full width */}
              <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h2 class="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  3D Structure
                </h2>
                <Show
                  when={mol().sdf_3d}
                  fallback={
                    <p class="py-8 text-center text-sm text-gray-400">
                      3D coordinates unavailable for this molecule
                    </p>
                  }
                >
                  <div
                    class="relative overflow-hidden rounded-md border border-gray-100"
                    style={{ height: '380px' }}
                  >
                    <Viewer3D sdf={mol().sdf_3d} />
                  </div>
                  <p class="mt-2 text-right text-xs text-gray-400">
                    Drag to rotate · Scroll to zoom · Right-click to pan
                  </p>
                </Show>
              </div>

            </div>
          )}
        </Show>

      </div>
    </div>
  )
}
