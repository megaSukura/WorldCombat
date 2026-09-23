/** 翻耕选定区域，并照料其中的作物。草属性宝可梦踩在翻过的土地上时攻击与特攻提高；离地或走出区域后提升消失。 */
namespace PokemonSkills {
    /** 公共能力阶梯：只对宝可梦生效（草属性判定本身要求原生个体）。 */
    function rototillerStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return NativeEffects.stage(NativeEffects.read(world, actor), stat);
    }
    /** 草属性判定跟随共享的现行属性（含后来追加草属性的层）。 */
    function rototillerQualifies(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        const types = NativeEffects.types(pokemon, NativeEffects.read(world, actor));
        for (let i = 0; i < types.length; i++) if (String(types[i]) === "grass") return true;
        return false;
    }
    /** 抬高并返回实际抬到的级数（顶到上限时可能少于请求值）。 */
    function rototillerRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = rototillerStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, rototillerStage(world, actor, stat) - before);
    }
    /** 给一个人上黑土状态；amplifier 记录这次抬了几级，离场或到期时照数收回。已在状态里的人只续时、不叠加。 */
    function rototillerGrant(world: CombatWorld, actor: CombatActor, amount: number, ticks: number): boolean {
        const levels = Math.max(1, Math.min(6, Math.round(amount)));
        const existing = MobEffects.read(world, actor, rototillerEffect);
        if (existing !== null) {
            if (existing.duration() < ticks * 0.5) MobEffects.apply(world, actor, rototillerEffect, ticks, existing.amplifier());
            return false;
        }
        rototillerRaise(world, actor, "atk", levels);
        rototillerRaise(world, actor, "spa", levels);
        MobEffects.apply(world, actor, rototillerEffect, ticks, levels);
        return true;
    }
    /** 收回黑土状态；等级的收回写在 mob_effect_removed 反应里。 */
    function rototillerRevoke(world: CombatWorld, actor: CombatActor): void {
        MobEffects.consume(world, actor, rototillerEffect);
    }

    /** 场地每一遍扫描：草属性必须站在土上且踩实地面才被喂养。 */
    function rototillerFeed(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        if (!rototillerQualifies(world, actor)) { rototillerRevoke(world, actor); return; }
        const body = world.observe(actor);
        if (body === null) return;
        if (!body.grounded()) { rototillerRevoke(world, actor); return; }
        const data: any = field.data || {};
        const gift = Math.max(1, Math.min(2, Math.round(Number(data.gift) || 1)));
        const ticks = Math.max(60, Math.round(Number(data.ticks) || 240));
        const radius = Number(data.radius) || rototillerReferenceRadius;
        const motes = Math.max(8, Math.round(Number(data.motes) || 16));
        const scale = Math.max(0.5, Math.min(2, radius / rototillerReferenceRadius));
        const ref = String(actor.ref());
        if (rototillerGrant(world, actor, gift, ticks)) {
            WorldFeedback.emit(world, rototillerScene, 1, body.position(),
                { moment: "fed", target: ref, grow: gift, motes: motes, scale: scale }, 26);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), rototillerFedText, [gift, gift], 28);
            world.sound("minecraft:block.crop.break", body.position(), 10, "{}");
        }
        WorldFeedback.keep(world, "world_combat:move_rototiller/fed/" + ref, rototillerScene, 1, body.position(),
            { moment: "fed", target: ref, grow: gift, motes: Math.max(4, Math.round(motes * 0.4)), scale: scale }, 30);
    }
    /** 场地还在时，让翻过的土面持续可见——黑土自己就是范围。 */
    function rototillerSustain(world: CombatWorld, field: WorldEffects.Field): void {
        const data: any = field.data || {};
        const radius = Number(data.radius) || rototillerReferenceRadius;
        const point = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
        WorldFeedback.keep(world, "world_combat:move_rototiller/soil", rototillerScene, 1, point,
            { moment: "soil", radius: radius, motes: Math.max(6, Math.round((Number(data.motes) || 16) * 0.35)),
              scale: Math.max(0.5, Math.min(2, radius / rototillerReferenceRadius)) }, 30);
    }

    // 场地行为：进入与驻留喂土，离场收回；每 5 刻续一次土面表现。
    WorldEffects.fieldRule(rototillerRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) { rototillerFeed(world, actor, field); },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) { rototillerFeed(world, actor, field); },
        leave: function (world: CombatWorld, actor: CombatActor) { rototillerRevoke(world, actor); },
        scan: function (_effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field) { rototillerSustain(world, field); }
    });

    // 黑土状态走完、被人解除，或被离场收回：按 amplifier 把这次抬起的双攻原样收回（只收当前实际持有的正等级）。
    WorldCombat.on("world_combat:move_rototiller/revert", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rototillerEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(0, Math.round(Number(data.amplifier) || 0));
        const lostAtk = Math.min(levels, Math.max(0, rototillerStage(world, actor, "atk")));
        const lostSpa = Math.min(levels, Math.max(0, rototillerStage(world, actor, "spa")));
        if (lostAtk > 0) NativeEffects.boost(world, actor, "atk", -lostAtk);
        if (lostSpa > 0) NativeEffects.boost(world, actor, "spa", -lostSpa);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, rototillerScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 22);
        if (String(data.cause) === "expired") WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), rototillerFadeText, [], 22);
    });

    /** 从落点往下找第一块可以被替换的实体方块，返回它上方一格的地面点。 */
    function rototillerGround(world: CombatWorld, centre: CombatPoint): CombatPoint {
        const x = Math.floor(centre.x()), z = Math.floor(centre.z()), y = Math.floor(centre.y());
        for (let dy = 1; dy >= -3; dy--) {
            const block = world.block(WorldCombat.point(x, y + dy, z));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return centre;
            return WorldCombat.point(x + 0.5, y + dy + 1, z + 0.5);
        }
        return centre;
    }
    /** 把半径内的表土换成同一层的粗土；租借、linger，到期原方块回来。返回换过的格数。 */
    function rototillerTill(world: CombatWorld, ground: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [];
        const r = Math.ceil(radius);
        const cx = Math.floor(ground.x()), cz = Math.floor(ground.z()), cy = Math.floor(ground.y());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            const x = cx + dx, z = cz + dz;
            for (let dy = 0; dy >= -2; dy--) {
                const block = world.block(WorldCombat.point(x, cy + dy, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                const above = world.block(WorldCombat.point(x, cy + dy + 1, z));
                if (id === "minecraft:farmland" || block.growable() || above !== null && above.growable()) break;
                if (id !== "minecraft:coarse_dirt") cells.push({ x: x, y: cy + dy, z: z, block: "minecraft:coarse_dirt" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(60, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    define({
        id: rototillerId,
        cooldownParameter: "wait",
        name: "耕地",
        description: "翻耕选定区域，并照料其中的作物。草属性宝可梦踩在翻过的土地上时攻击与特攻提高；离地或走出区域后提升消失。",
        uses: ["把草属性伙伴脚下的地翻开，让它们一起变强", "在交战位置先翻一块土，逼对手绕开", "给浮空的草属性留一块踩不到的地"],
        kind: "point",
        range: 6,
        maxRange: 10,
        prepare: 11,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "soil",
        defaults: { ridge: 1, ai: { maxChase: 12, minAlly: 0 } },
        fields: [
            field(pathOf("ridge"), "耕法", "choice", {
                options: [
                    { value: 1, label: "垄作" },
                    { value: 0, label: "急耕" }
                ],
                help: "垄作：地更大、更久、双攻再 +1，代价是起手 +3 刻、冷却 ×1.15；急耕：地小、时短、双攻按本体，起手与冷却都更省。"
            })
        ],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[rototillerId], detail: { values: config } };
            return { radius: p(rototillerId, "patch", context), geometry: "area", style: "soil", color: 0x6B4A2B,
                label: config && Number(config.ridge) === 1 ? "耕地 · 垄作" : "耕地 · 急耕" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[rototillerId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(4, Math.round(p(rototillerId, "tempo", context))),
                recover: Math.max(3, Math.round(p(rototillerId, "aftercast", context))),
                cooldown: Math.round(p(rototillerId, "wait", context)),
                active: 1,
                range: p(rototillerId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_rototiller:rake", rototillerScene, 1, action.origin(),
                JSON.stringify({ moment: "rake", clods: Math.round(p(rototillerId, "clods", action)),
                    ridge: config && Number(config.ridge) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const point = rototillerGround(world, action.targetPosition());
            const gift = Math.max(1, Math.min(2, Math.round(p(rototillerId, "gift", action))));
            const radius = Math.max(1.2, p(rototillerId, "patch", action));
            const ticks = Math.max(120, Math.round(p(rototillerId, "soilTicks", action)));
            const clods = Math.max(10, Math.round(p(rototillerId, "clods", action)));
            const scale = radius / rototillerReferenceRadius;
            // Turning the soil gives each real growing plant one bounded native care attempt.
            const plants = WorldCultivation.sites(world, point, Math.min(4, radius));
            for (let i = 0; i < Math.min(8, plants.length); i++) WorldCultivation.use(world, plants[i]);
            const tilled = rototillerTill(world, point, radius, ticks);
            WorldEffects.field(world, rototillerRule, point, radius,
                { gift: gift, ticks: ticks, motes: clods, radius: radius }, ticks);
            world.sound("minecraft:item.hoe.till", point, 16, "{}");
            world.sound("minecraft:block.gravel.break", point, 14, "{}");
            WorldFeedback.emit(world, rototillerScene, 1, point,
                { moment: "till", radius: radius, clods: clods, gift: gift, tilled: tilled, scale: scale }, 40);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.9, 0)), rototillerTillText,
                [gift, gift, Math.round(ticks / 20), tilled], 34);
            done(action);
        }
    });
}
