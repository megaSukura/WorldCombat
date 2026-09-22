/** Native equipment sources contribute to any subject's behavior without owning its inventory. */
namespace EquipmentBehavior {
    export interface Context { world: CombatWorld; wearer: CombatActor; subject: CombatActor; frame: WorldBehavior.Frame; equipment: CombatEquipment[]; }
    export var registry = new WorldTraits.Registry<Context>();
    export function define(id: string, matches: (equipment: CombatEquipment) => boolean,
                           apply: (context: Context) => void): void {
        registry.define({ id: id, hooks: { behavior: apply } });
        registry.provide(id, context => context.equipment.some(matches) ? [id] : []);
    }
    export function apply(world: CombatWorld, wearer: CombatActor, subject: CombatActor, frame: WorldBehavior.Frame): void {
        registry.dispatch("behavior", { world: world, wearer: wearer, subject: subject, frame: frame,
            equipment: Array.prototype.slice.call(world.equipment(wearer)) }, frame);
    }
}
