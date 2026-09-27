/** 翻耕选定区域，并照料其中的作物。草属性宝可梦踩在翻过的土地上时攻击与特攻提高；离地或走出区域后提升消失。 */
namespace PokemonSkills {
    /** terrainResult 的交地结果：成功格决定增益区域与画面，空洞不参与。 */
    export interface RototillerTill { id: number; cells: string[]; placed: number[][]; skipped: number; }
    /** 草属性判定跟随共享的现行属性（含后来追加草属性的层）；AI 与执行共用同一资格。 */
    export function rototillerQualifies(world: CombatWorld, actor: CombatActor): boolean {
        if (!world.valid(actor)) return false;
        const types = PokemonDamage.combatants.read(world, actor).types;
        for (let i = 0; i < types.length; i++) if (String(types[i]) === "grass") return true;
        return false;
    }
    /**
     * 这块地是否仍罩着这只：除本场外，场上还有别的同规则耕地场在它的真实范围与有限高度内。
     * 用来决定离开一场时是否该收回黑土身份，避免把另一场的增益一起收掉。
     */
    function rototillerCovered(world: CombatWorld, actor: CombatActor, exceptId: number): boolean {
        const body = world.observe(actor);
        if (body === null) return false;
        const at = body.position(), areas = WorldEffects.areas(world, rototillerRule);
        for (let i = 0; i < areas.length; i++) {
            if (areas[i].id === exceptId) continue;
            const dx = areas[i].position[0] - at.x(), dz = areas[i].position[2] - at.z(), dy = areas[i].position[1] - at.y();
            if (Math.sqrt(dx * dx + dz * dz) <= areas[i].radius && Math.abs(dy) <= Math.max(2, areas[i].radius + 1)) return true;
        }
        return false;
    }
    /** 收回本场给这只的贡献：只关本场那一个窗口；没有别的耕地场再罩住它时，再收回黑土身份。 */
    function rototillerRevoke(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const windows: any = field.data && field.data.windows, ref = String(actor.ref());
        if (windows && windows[ref]) { NativeEffects.windowClose(world, Number(windows[ref])); delete windows[ref]; }
        if (!rototillerCovered(world, actor, Number(field.id) || 0)) MobEffects.consume(world, actor, rototillerEffect);
    }
    /** 自然可耕地：原生土类、草方块或已装机模的同类；耕地、土径与作物保持原样。 */
    function rototillerNatural(id: string, block: CombatBlock): boolean {
        if (id === "minecraft:farmland" || id === "minecraft:dirt_path") return false;
        if (block.tagged("minecraft:dirt") || block.tagged("c:dirt")) return true;
        return id === "minecraft:grass_block" || id === "minecraft:mycelium";
    }
    /**
     * 踩在真正翻过的土格上：身体真正着地，整块 AABB 底面与某个成功格在水平面相交，且那一格脚下仍是本次翻出的粗土。
     * 用真实底面而非只取 boundsMin 的一个角；土被复原或被换成别的方块时都不再成立。
     */
    function rototillerStanding(world: CombatWorld, body: CombatObservation, cells: string[]): boolean {
        if (!body.grounded()) return false;
        const min = body.boundsMin(), max = body.boundsMax(), feet = min.y();
        for (let i = 0; i < cells.length; i++) {
            const parts = cells[i].split(",");
            const x = Number(parts[0]), y = Number(parts[1]), z = Number(parts[2]);
            if (!(min.x() < x + 1 && max.x() > x && min.z() < z + 1 && max.z() > z)) continue;
            if (Math.abs(feet - (y + 1)) > 0.35) continue;
            const under = world.block(WorldCombat.point(x, y, z));
            if (under !== null && String(under.id()) === "minecraft:coarse_dirt") return true;
        }
        return false;
    }

    /** 场地每一遍扫描：草属性必须站在真正翻过的土格上、且踩实地面才被喂养；翻不到的土地不收。 */
    function rototillerFeed(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        if (!rototillerQualifies(world, actor)) { rototillerRevoke(world, actor, field); return; }
        const body = world.observe(actor);
        if (body === null) return;
        const data: any = field.data || {};
        const cells: string[] = Array.isArray(data.cells) ? data.cells : [];
        if (!rototillerStanding(world, body, cells)) { rototillerRevoke(world, actor, field); return; }
        const gift = Math.max(1, Math.min(2, Math.round(Number(data.gift) || 1)));
        const ticks = Math.max(60, Math.round(Number(data.ticks) || 240));
        const radius = Number(data.radius) || rototillerReferenceRadius;
        const motes = Math.max(8, Math.round(Number(data.motes) || 16));
        const scale = Math.max(0.5, Math.min(2, radius / rototillerReferenceRadius));
        const ref = String(actor.ref());
        const windows: any = data.windows || (data.windows = {});
        const current = Number(windows[ref] || 0);
        const definition = String(actor.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
        if (current && world.effects(actor, definition).some(view => view.id() === current
            && CombatStages.windowAlive(world, actor, JSON.parse(String(view.data()))))) return;
        const first = !windows[ref];
        // 黑土标记只承载共享身份；真正抬起的双攻记在本场自己的窗口里，绑在这份载体上：载体结束/被驱散时一并复原。
        const previous = MobEffects.read(world, actor, rototillerEffect);
        const carrier = previous !== null && previous.duration() >= ticks * 0.5 ? previous
            : MobEffects.apply(world, actor, rototillerEffect, ticks, 0);
        if (carrier === null) return;
        const id = NativeEffects.boostWindow(world, actor, { atk: gift, spa: gift },
            Math.max(40, carrier.duration() > 0 ? carrier.duration() : ticks),
            "rototiller:" + String(field.id || field.rule), carrier, previous);
        if (!id) return;
        world.operation(id, "world_combat:stage_owner", JSON.stringify({ actor: String(world.source().ref()), definition: "world_combat:field", id: field.id }));
        windows[ref] = id;
        if (first) {
            WorldFeedback.emit(world, rototillerScene, 1, body.position(),
                { moment: "fed", target: ref, grow: gift, motes: motes, scale: scale }, 26);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), rototillerFedText, [gift, gift], 28);
            world.sound("minecraft:block.crop.break", body.position(), 10, "{}");
        }
        WorldFeedback.keep(world, "world_combat:move_rototiller/fed/" + ref, rototillerScene, 1, body.position(),
            { moment: "fed", target: ref, grow: gift, motes: Math.max(4, Math.round(motes * 0.4)), scale: scale }, 30);
    }
    /** 场地还在时，让真正翻过的土面持续可见——贴地与逐格轮廓都绑在这条场地上，随它一起收。 */
    function rototillerSustain(effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
        const data: any = field.data || {};
        const radius = Number(data.radius) || rototillerReferenceRadius;
        const point = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
        const scale = Math.max(0.5, Math.min(2, radius / rototillerReferenceRadius));
        const cells: string[] = Array.isArray(data.cells) ? data.cells : [];
        const marks: number[][] = [];
        // 只描仍有效的土格：被复原、被换成别的方块或已被踩掉的格不再画叶光与轮廓。
        for (let i = 0; i < cells.length; i++) {
            const parts = cells[i].split(",");
            const x = Number(parts[0]), y = Number(parts[1]), z = Number(parts[2]);
            const block = world.block(WorldCombat.point(x, y, z));
            if (block === null || String(block.id()) !== "minecraft:coarse_dirt") continue;
            marks.push([x + 0.5, y + 1.05, z + 0.5]);
        }
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_rototiller/soil", rototillerScene, 1, point,
            { moment: "soil", tilled: marks.length, motes: Math.max(6, Math.round((Number(data.motes) || 16) * 0.35)), scale: scale });
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_rototiller/cells", rototillerSoilScene, 1, point,
            { cells: marks, scale: scale });
    }

    // 场地行为：进入与驻留喂土，离场只撤本场自己的贡献；每 5 刻续一次土面表现。
    WorldEffects.fieldRule(rototillerRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) { rototillerFeed(world, actor, field); },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) { rototillerFeed(world, actor, field); },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) { rototillerRevoke(world, actor, field); },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field) { rototillerSustain(effect, world, field); }
    });

    // 黑土标记走完、被人解除，或被离场收回：双攻由绑在载体上的窗口自己复原，这里只在身份真的消失时收尾表现。
    WorldCombat.on("world_combat:move_rototiller/revert", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rototillerEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || CombatStatus.has(world, actor, rototillerStatus)) return;
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
    /** 落点原地是否翻得动：自然土且上方没有作物。AI 预检与执行共用同一标准，别再对石头/木板排一趟空计划。 */
    export function rototillerTillable(world: CombatWorld, centre: CombatPoint): boolean {
        const x = Math.floor(centre.x()), z = Math.floor(centre.z()), y = Math.floor(centre.y());
        for (let dy = 1; dy >= -3; dy--) {
            const block = world.block(WorldCombat.point(x, y + dy, z));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return false;
            const above = world.block(WorldCombat.point(x, y + dy + 1, z));
            if (above !== null && above.growable()) return false;
            return id === "minecraft:coarse_dirt" || rototillerNatural(id, block);
        }
        return false;
    }
    /** 真正翻耕：只对自然土写下粗土，耕地与作物原样保留；用 terrainResult 的成功格当这次增益的实际覆盖。 */
    function rototillerTill(world: CombatWorld, ground: CombatPoint, radius: number, ticks: number): PokemonSkills.RototillerTill {
        const request: any[] = [], existing: string[] = [];
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
                // 作物保护：土上正长着可生长的植物（草、花、农作物）就整格不动。
                if (above !== null && above.growable()) break;
                if (id === "minecraft:coarse_dirt") { existing.push(x + "," + (cy + dy) + "," + z); break; }
                if (rototillerNatural(id, block)) request.push({ x: x, y: cy + dy, z: z, block: "minecraft:coarse_dirt" });
                break;
            }
        }
        let lease = 0, placed: number[][] = [], skipped = 0;
        if (request.length) {
            try {
                const receipt: any = JSON.parse(String(world.terrainResult(JSON.stringify({ cells: request, replace: true, linger: true }), Math.max(60, Math.round(ticks)))));
                lease = Number(receipt.id) || 0;
                placed = Array.isArray(receipt.placed) ? receipt.placed : [];
                skipped = Array.isArray(receipt.skipped) ? receipt.skipped.length : Math.max(0, request.length - placed.length);
            } catch (error) { lease = 0; placed = []; skipped = request.length; }
        }
        const cells = existing.slice();
        for (let i = 0; i < placed.length; i++) cells.push(placed[i][0] + "," + placed[i][1] + "," + placed[i][2]);
        return { id: lease, cells: cells, placed: placed, skipped: skipped };
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
            const tilled = rototillerTill(world, point, radius, ticks);
            // 非可耕表面（石、木板等）：不换方块、不建增益场地，也不虚报肥土。
            if (!tilled.cells.length) {
                WorldFeedback.emit(world, rototillerScene, 1, point,
                    { moment: "barren", clods: Math.max(6, Math.round(clods * 0.4)), scale: scale }, 30);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.9, 0)), rototillerBarrenText, [], 30);
                world.sound("minecraft:block.gravel.break", point, 12, "{}");
                done(action);
                return;
            }
            // 作物照料走既有原生生长入口，只对真正翻到的地块。
            const plants = WorldCultivation.sites(world, point, Math.min(4, radius));
            for (let i = 0; i < Math.min(8, plants.length); i++) WorldCultivation.use(world, plants[i]);
            WorldEffects.field(world, rototillerRule, point, radius,
                { gift: gift, ticks: ticks, motes: clods, radius: radius, cells: tilled.cells, tilled: tilled.placed.length }, ticks);
            // 每个真正翻到的格子各自起一撮土；没翻到的洞不出土。
            const step = Math.max(1, Math.ceil(tilled.placed.length / 32));
            for (let i = 0; i < tilled.placed.length; i += step) {
                const cell = tilled.placed[i];
                WorldFeedback.emit(world, rototillerScene, 1, WorldCombat.point(cell[0] + 0.5, cell[1] + 1, cell[2] + 0.5),
                    { moment: "till_cell", clods: Math.max(3, Math.round(clods / 6)), grow: gift, scale: Math.max(0.16, scale * 0.5) }, 30);
            }
            world.sound("minecraft:item.hoe.till", point, 16, "{}");
            world.sound("minecraft:block.gravel.break", point, 14, "{}");
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.9, 0)), rototillerTillText,
                [gift, gift, Math.round(ticks / 20), tilled.cells.length], 34);
            done(action);
        }
    });
}
