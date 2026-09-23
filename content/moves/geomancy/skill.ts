/**
 * 大地掌控 / geomancy 的出手方式。
 *
 * 核心念头：把身体扎进大地、从地脉吸取能量——一圈地纹在脚下张开、顺着裂缝把光抽上来，使用者一动不动地
 *   立在阵心；能量吸满的下一刻，地纹猛地亮透、能量反冲回身体，特攻、特防、速度同时大涨。
 *   它是这一族里唯一的**两拍蓄力**，也是唯一把自己钉在地上、并在场上留下地纹的一招。
 *
 * 三幕：
 *   定身（windup，提交前）：收势、脚下浮起地纹的轮廓；可被打断，打断不消耗任何东西。
 *   汲取（提交后）：立刻 Pay：把自己挂上 rooted（立定不动），挂上共享身份 world_combat:status/geomancy 的
 *     蓄力窗口，并在脚下租借一圈地纹（world.terrain，linger）；蓄力期间地脉光点不断升起，每 20 刻续播。
 *   爆发或崩散（absorb 刻后）：没被睡得／冻住时，特攻、特防、速度各 +gift，地纹炸开、能量反冲；
 *     被控住时能量半途崩散，什么也拿不到。
 *
 * 与同族分开：龙之舞／蝶舞是一拍完成的自我强化，破壳是自损换爆发；大地掌控是唯一**必须站着等第二拍**的招，
 * 也是唯一会把地面本身变成阵的一招。
 */
namespace PokemonSkills {
    const geomancyScene = "world_combat:move_geomancy";
    const geomancyCharge = "world_combat:geomancy_charge";
    const geomancyChargingText = "world_combat.move.geomancy.text.charging";
    const geomancyReleaseText = "world_combat.move.geomancy.text.release";
    const geomancyCollapseText = "world_combat.move.geomancy.text.collapse";
    /** 表现里的参考半径：`data.scale = 实际阵心半径 / 这个数`。 */
    const geomancyReference = 2.4;

    /** 从 (x, from) 向下找最上面一块可替换的实心方块；遇到基岩／屏障／液体就放弃这一列。 */
    function geomancySurface(world: CombatWorld, x: number, z: number, from: number): number {
        for (let dy = 1; dy >= -3; dy--) {
            const y = from + dy;
            const block = world.block(WorldCombat.point(x, y, z));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") return -99999;
            return y;
        }
        return -99999;
    }

    /** 脚下租借一圈地纹：外环苔石、内环一圈低一层的苔石、四角一点萤石；到期原方块回来。 */
    function geomancyRing(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = Object.create(null);
        const r = Math.ceil(radius), inner = radius * 0.55;
        const cx = Math.floor(centre.x()), cz = Math.floor(centre.z()), cy = Math.floor(centre.y());
        function place(x: number, z: number, block: string): void {
            const key = x + "," + z;
            if (seen[key]) return;
            const y = geomancySurface(world, x, z, cy);
            if (y < -1000) return;
            seen[key] = true;
            cells.push({ x: x, y: y, z: z, block: block });
        }
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance < inner || distance > radius) continue;
            place(cx + dx, cz + dz, distance > radius - 0.6 ? "minecraft:moss_block" : "minecraft:green_terracotta");
        }
        for (let k = 0; k < 4; k++) {
            const angle = k * Math.PI / 2;
            place(cx + Math.round(Math.cos(angle) * radius * 0.62), cz + Math.round(Math.sin(angle) * radius * 0.62), "minecraft:glowstone");
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(20, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "geomancy",
        cooldownParameter: "wait",
        name: "大地掌控",
        description: "把身体扎进大地吸取地脉能量：脚下张开一圈地纹、立定不动吸满能量，下一拍地纹炸开、能量反冲，特攻、特防、速度同时提高。蓄力期间若被睡得或冻住，能量崩散、什么也拿不到。",
        uses: ["开战前在安全距离先扎地蓄力", "用一段立定换取三项永久提升", "把脚下的地变成阵、标记这块战场"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 10,
        active: 1,
        recover: 8,
        cooldown: 120,
        style: "geomancy",
        stationary: true,
        defaults: { ai: { maxChase: 22, safeGap: 8 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: Math.max(1.2, p("geomancy", "circle", pokemon)), geometry: "area", style: "geomancy", color: 0x8FD46A,
                label: "大地掌控" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["geomancy"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("geomancy", "tempo", context)),
                recover: Math.round(p("geomancy", "aftercast", context)),
                cooldown: Math.round(p("geomancy", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_geomancy:settle", geomancyScene, 1, action.origin(),
                JSON.stringify({ moment: "gather" }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(2, Math.round(p("geomancy", "gift", action))));
            const absorb = Math.max(12, Math.round(p("geomancy", "absorb", action)));
            const circle = Math.max(1.2, p("geomancy", "circle", action));
            const runes = Math.max(12, Math.round(p("geomancy", "runes", action)));
            const rise = Math.max(0.02, p("geomancy", "rise", action));
            const linger = Math.max(20, Math.round(p("geomancy", "linger", action)));
            const scale = circle / geomancyReference;
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));

            WorldEffects.apply(world, actor, "rooted", {}, absorb + 6);
            MobEffects.apply(world, actor, geomancyCharge, absorb + 4, gift);
            const laid = geomancyRing(world, feet, circle, absorb + linger);
            WorldFeedback.emit(world, geomancyScene, 1, feet,
                { moment: "plant", actor: String(actor.ref()), gift: gift, absorb: absorb, circle: circle, runes: runes,
                    rise: rise, scale: scale, laid: laid, intensity: Math.max(0.8, Math.min(2.2, runes / 26)) }, absorb + 16);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), geomancyChargingText, [], absorb);
            world.sound("minecraft:block.beacon.activate", feet, 16, "{}");

            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            action.after(absorb, function (current: CombatAction) {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                const held = CombatStatus.behaves(scope, actor, "sleep") || CombatStatus.behaves(scope, actor, "frozen");
                if (held) {
                    WorldFeedback.emit(scope, geomancyScene, 1, here.position(),
                        { moment: "collapse", actor: String(actor.ref()), circle: circle, scale: scale, runes: runes }, 26);
                    WorldFeedback.text(scope, here.position().plus(WorldCombat.point(0, 1.4, 0)), geomancyCollapseText, [], 26);
                    scope.sound("minecraft:block.beacon.deactivate", here.position(), 14, "{}");
                    finish(current);
                    return;
                }
                NativeEffects.boost(scope, actor, "spa", gift);
                NativeEffects.boost(scope, actor, "spd", gift);
                NativeEffects.boost(scope, actor, "spe", gift);
                WorldFeedback.emit(scope, geomancyScene, 1, here.position(),
                    { moment: "release", actor: String(actor.ref()), gift: gift, circle: circle, scale: scale, runes: runes,
                        rise: rise, intensity: Math.max(1, Math.min(2.6, gift + runes / 30)) }, 40);
                WorldFeedback.text(scope, here.position().plus(WorldCombat.point(0, 1.4, 0)), geomancyReleaseText, [gift], 32);
                scope.sound("minecraft:block.beacon.power_select", here.position(), 18, "{}");
                finish(current);
            });
        }
    });

    // 蓄力期间：每 20 刻续播一次地纹上身的低密度光点（少而稳，让出视线）。
    WorldCombat.on("world_combat:move_geomancy/channel", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== geomancyCharge || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, geomancyCharge) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const circle = Math.max(1.2, 0.8 + body.width() * 1.2 + body.height() * 0.4);
        WorldFeedback.keep(world, "world_combat:move_geomancy/channel/" + String(actor.ref()), geomancyScene, 1, body.position(),
            { moment: "channel", actor: String(actor.ref()), runes: 12, circle: circle, rise: 0.06, scale: circle / geomancyReference }, 30);
    });
}
