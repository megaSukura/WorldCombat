namespace MementoDeparture {
    export function point(raw: number[]): CombatPoint { return WorldCombat.point(raw[0], raw[1], raw[2]); }
    export function inside(region: WorldGeometry.Region, body: CombatObservation): boolean {
        const at = body.position();
        return region.contains(at) || region.contains(WorldCombat.point(at.x(), body.boundsMin().y(), at.z()))
            || region.contains(WorldCombat.point(at.x(), body.boundsMax().y(), at.z()));
    }
}
