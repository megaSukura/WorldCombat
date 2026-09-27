/** The release-time environment selects one real move; its recipe owns contacts and aftermath. */
namespace PokemonSkills {
    const naturepowerScene = "world_combat:move_naturepower";
    const naturepowerCallKey = "world_combat:naturepower/call";
    export const naturepowerSites: { [key: string]: string } = {
        verdant: "energyball", water: "hydropump", ember: "flamethrower", earth: "powergem", plain: "triattack"
    };
    function naturepowerTagged(block: CombatBlock, tags: string[]): boolean { return tags.some(tag => block.tagged(tag)); }
    /** The point is the actual lower body surface, not a fixed offset from its centre. */
    export function naturepowerSiteAt(world: CombatWorld, foot: CombatPoint): string {
        const immersed = foot.plus(WorldCombat.point(0, .05, 0)), fluid = world.fluid(immersed);
        if (fluid && !fluid.empty() && immersed.y() <= fluid.position().y() + fluid.height()) {
            if (fluid.tagged("minecraft:lava")) return "ember";
            if (fluid.tagged("minecraft:water")) return "water";
        }
        const blocks = [world.block(immersed), world.block(foot.plus(WorldCombat.point(0, -.1, 0)))];
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i]; if (!block) continue;
            const id = String(block.id());
            if (block.tagged("minecraft:fire") || id === "minecraft:magma_block"
                || block.tagged("minecraft:campfires") && block.property("lit") === "true") return "ember";
            if (naturepowerTagged(block, ["minecraft:ice", "minecraft:snow"]) || id === "minecraft:powder_snow") return "water";
            if (["minecraft:grass_block", "minecraft:moss_block", "minecraft:moss_carpet", "minecraft:mycelium", "minecraft:podzol"].indexOf(id) >= 0
                || naturepowerTagged(block, ["minecraft:leaves", "minecraft:flowers", "minecraft:crops", "minecraft:saplings",
                    "minecraft:replaceable_plants", "minecraft:logs", "minecraft:planks", "c:plants"])) return "verdant";
            if (naturepowerTagged(block, ["minecraft:base_stone_overworld", "minecraft:base_stone_nether", "minecraft:stone_bricks", "c:stones", "c:cobblestones"])) return "earth";
        }
        return "plain";
    }
    export function naturepowerFoot(body: CombatObservation): CombatPoint {
        const at = body.position(); return WorldCombat.point(at.x(), body.boundsMin().y(), at.z());
    }
    export function naturepowerBorrowedReach(context: NumberContext, site: string): number {
        const skill = skills[naturepowerSites[site]]; if (!skill) return 0;
        const config = context.world && context.actor ? PokemonSkills.config(context.world, context.actor, skill.id) : skill.defaults || {};
        const resolved = skill.resolve && skill.resolve(context.pokemon, config, context.world, context.actor, context.attributes);
        return Math.min(p(naturepowerId, "reach", context), resolved && resolved.range !== undefined ? resolved.range : skill.range);
    }
    /** 预览射程跟最终借招上限：有现场就按脚下介质解出所借招式的真实射程，否则退回本招基距。 */
    function naturepowerPreviewReach(config: any, pokemon: CombatPokemon | undefined, inspection: { world?: CombatWorld | null; actor?: CombatActor | null; attributes?: IndividualAttributes.Context } | undefined): number {
        const context: NumberContext = { pokemon: pokemon as CombatPokemon, skill: skills[naturepowerId], detail: { values: config },
            world: inspection && inspection.world || null, actor: inspection && inspection.actor || null, attributes: inspection && inspection.attributes };
        if (!pokemon || !context.world || !context.actor) return pokemon ? p(naturepowerId, "reach", context) : skills[naturepowerId].range;
        const body = context.world.observe(context.actor); if (!body) return p(naturepowerId, "reach", context);
        return naturepowerBorrowedReach(context, naturepowerSiteAt(context.world, naturepowerFoot(body)));
    }
    PokemonDamage.metadata.define({ id: "world_combat:move_naturepower/call-power", apply: context => {
        const raw = context.action ? context.action.data(naturepowerCallKey) : context.world && context.world.originData(naturepowerCallKey);
        if (!raw) return;
        const paid = JSON.parse(raw);
        if (paid.move === context.metadata.move && paid.factor === 1.25) context.metadata.power *= paid.factor;
    } });
    WorldCombat.on("world_combat:move_naturepower/committed", "world_combat:committed", "", event => {
        const action = event.action(), raw = action && action.data(naturepowerCallKey);
        if (raw) event.world().originData(naturepowerCallKey, raw);
    });
    function naturepowerCue(action: CombatAction, id: string): void {
        action.present("naturepower:call", "world_combat:feedback", 1, action.origin(), JSON.stringify({
            kind: "world-text", start: action.sense().tick(), duration: 26,
            key: "world_combat.move.naturepower.text.call", args: [{ key: "cobblemon.move." + id }]
        }));
    }
    define({
        id: naturepowerId, name: "自然之力",
        description: "借释放时所在环境唤出一招：草木能量球、水冰雪水炮、火岩浆喷射火焰、岩地力量宝石，其余三重攻击。",
        uses: ["换站位借不同招式", "沿原准心唤出自然力量", "多准备片刻催发本次威力"],
        kind: "aim", range: 11, maxRange: 18, prepare: 0, active: 0, recover: 8, cooldown: 30,
        style: "naturepower", maximumTicks: 600, defaults: { charged: false }, fields: [flag("charged", "催发自然之力")],
        indicator: function (config, pokemon, inspection) {
            return { radius: naturepowerPreviewReach(config, pokemon, inspection), geometry: "line", style: "naturepower", label: "自然之力" };
        },
        resolve: (pokemon, config, world, actor, attributes) => {
            const context: NumberContext = { pokemon, skill: skills[naturepowerId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const body = world && actor && world.observe(actor);
            return { prepare: Math.round(p(naturepowerId, "windupTicks", context)), recover: 8,
                cooldown: Math.round(p(naturepowerId, "cooldown", context)), active: 0,
                range: body ? naturepowerBorrowedReach(context, naturepowerSiteAt(world!, naturepowerFoot(body))) : p(naturepowerId, "reach", context) };
        },
        run: (action, _move, config) => {
            const body = action.sense().observe(action.actor()); if (!body) { action.reject("actor-left"); return; }
            const scenes = WorldFeedback.actionScenes(naturepowerScene);
            let site = naturepowerSiteAt(action.sense(), naturepowerFoot(body));
            action.stopMovement();
            scenes.show(action, "gather", naturepowerFoot(body), { moment: site });
            naturepowerCue(action, naturepowerSites[site]);
            const total = Math.max(1, Math.round(p(naturepowerId, "windupTicks", action)));
            // 借力期间每刻重读真实环境：介质或所借招式变了就提前更新聚拢与招名，不等释放才改。
            function advance(current: CombatAction, elapsed: number): void {
                const observed = current.sense().observe(current.actor()); if (!observed) { current.reject("actor-left"); return; }
                const now = naturepowerSiteAt(current.sense(), naturepowerFoot(observed));
                if (now !== site) {
                    site = now;
                    scenes.show(current, "gather", naturepowerFoot(observed), { moment: site });
                    naturepowerCue(current, naturepowerSites[site]);
                }
                if (elapsed < total) { current.after(1, next => advance(next, elapsed + 1)); return; }
                scenes.stop(current);
                const id = naturepowerSites[site];
                const selected = NativeLoadout.select(current, [id], { eligibility: "caller", cooldown: Math.round(p(naturepowerId, "cooldown", current)),
                    input: { target: current.target(), point: current.targetPosition(), direction: current.direction() } });
                if (!selected) { current.reject("environment-move-unavailable"); return; }
                current.data(naturepowerCallKey, JSON.stringify({ move: id, site: site, factor: config && config.charged === true ? 1.25 : 1 }));
                NativeLoadout.call(current, id, selected.options);
            }
            advance(action, 0);
        }
    });
}
