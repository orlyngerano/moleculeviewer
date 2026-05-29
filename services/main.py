from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, rdMolDescriptors
from rdkit.Chem.Draw import rdMolDraw2D

app = FastAPI(title="Drug Discovery API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class MoleculeResponse(BaseModel):
    smiles: str
    formula: str
    molecular_weight: float
    num_heavy_atoms: int
    num_bonds: int
    num_rings: int
    num_rotatable_bonds: int
    num_hbd: int
    num_hba: int
    logp: float
    tpsa: float
    svg: str
    sdf_3d: str  # MOL/SDF block with 3D coordinates; empty if generation fails


@app.get("/")
async def root():
    return {"message": "Drug Discovery API"}


@app.get("/molecule", response_model=MoleculeResponse)
async def get_molecule(
    smiles: str = Query(..., description="SMILES string of the molecule"),
):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise HTTPException(status_code=400, detail=f"Invalid SMILES: '{smiles}'")

    drawer = rdMolDraw2D.MolDraw2DSVG(400, 300)
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    svg = drawer.GetDrawingText()

    # Generate 3D coordinates: add Hs → ETKDGv3 distance geometry → MMFF94 optimization
    sdf_3d = ''
    try:
        mol_h = Chem.AddHs(mol)
        params = AllChem.ETKDGv3()
        params.randomSeed = 42
        ok = AllChem.EmbedMolecule(mol_h, params)
        if ok == 0:
            AllChem.MMFFOptimizeMolecule(mol_h)
            sdf_3d = Chem.MolToMolBlock(mol_h)
    except Exception:
        sdf_3d = ''

    return MoleculeResponse(
        smiles=Chem.MolToSmiles(mol),
        formula=rdMolDescriptors.CalcMolFormula(mol),
        molecular_weight=round(Descriptors.ExactMolWt(mol), 4),
        num_heavy_atoms=mol.GetNumHeavyAtoms(),
        num_bonds=mol.GetNumBonds(),
        num_rings=rdMolDescriptors.CalcNumRings(mol),
        num_rotatable_bonds=rdMolDescriptors.CalcNumRotatableBonds(mol),
        num_hbd=rdMolDescriptors.CalcNumHBD(mol),
        num_hba=rdMolDescriptors.CalcNumHBA(mol),
        logp=round(Descriptors.MolLogP(mol), 4),
        tpsa=round(rdMolDescriptors.CalcTPSA(mol), 4),
        svg=svg,
        sdf_3d=sdf_3d,
    )
