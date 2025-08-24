from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from pathlib import Path
import json

app = FastAPI(title="Recipe House API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = Path(__file__).parent / "data" / "recipes.json"

class Recipe(BaseModel):
    id: int = Field(..., ge=1)
    name: str
    category: str
    rating: int = 0
    ingredients: List[str] = []
    instructions: str
    image: Optional[str] = None

def _load():
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    return []

def _save(items):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")

@app.get("/api/recipes")
def list_recipes():
    return _load()

@app.get("/api/recipes/{recipe_id}")
def get_recipe(recipe_id: int):
    for it in _load():
        if it["id"] == recipe_id:
            return it
    raise HTTPException(404, "Recipe not found")

@app.post("/api/recipes", status_code=201)
def create_recipe(recipe: Recipe):
    items = _load()
    if any(i["id"] == recipe.id for i in items):
        raise HTTPException(400, "ID already exists")
    items.append(recipe.dict())
    _save(items)
    return recipe

# NEW: general edit endpoint
@app.patch("/api/recipes/{recipe_id}")
def update_recipe(recipe_id: int, payload: dict):
    allowed = {"name", "category", "ingredients", "instructions", "image", "rating"}
    items = _load()
    for it in items:
        if it["id"] == recipe_id:
            for k, v in payload.items():
                if k in allowed:
                    it[k] = v
            _save(items)
            return it
    raise HTTPException(404, "Recipe not found")

# rating-only (stars can keep using this)
@app.patch("/api/recipes/{recipe_id}/rating")
def set_rating(recipe_id: int, payload: dict):
    if "rating" not in payload:
        raise HTTPException(400, "rating required")
    rating = int(payload["rating"])
    if not (0 <= rating <= 5):
        raise HTTPException(400, "rating must be 0..5")
    items = _load()
    for it in items:
        if it["id"] == recipe_id:
            it["rating"] = rating
            _save(items)
            return {"ok": True}
    raise HTTPException(404, "Recipe not found")

@app.delete("/api/recipes/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int):
    items = _load()
    new_items = [i for i in items if i["id"] != recipe_id]
    if len(new_items) == len(items):
        raise HTTPException(404, "Recipe not found")
    _save(new_items)
