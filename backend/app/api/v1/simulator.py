from fastapi import APIRouter

from app.api.v1.deps import SimulatorDep
from app.schemas.simulator import SimulatorStatus

router = APIRouter(prefix="/simulator", tags=["simulator"])


@router.get("/status")
async def get_status(simulator: SimulatorDep) -> SimulatorStatus:
    return simulator.status()


@router.post("/start")
async def start(simulator: SimulatorDep) -> SimulatorStatus:
    """Start creating live orders. Starting a running simulator changes nothing."""
    await simulator.start()
    return simulator.status()


@router.post("/stop")
async def stop(simulator: SimulatorDep) -> SimulatorStatus:
    """Stop the simulator; orders that are still being prepared are completed."""
    await simulator.stop()
    return simulator.status()
