/**
 * 瞬间移动 / teleport 的出手方式。
 *
 * 核心念头：折叠空间，把自己从原地瞬间挪到手动选定的**真实三维落点**（可以是高台），顺手甩掉正盯着自己的敌人
 *   ——「我在这儿」和「我不在这儿」发生在同一瞬间。这是这一族里最纯粹的一招：不撞、不留东西、不给等级，只把自己搬走。
 *
 * 两幕：
 *   起（fold，提交前）：脚边空间裂开一圈冷光，落点上亮起一座真实可站的「小门」预告；终点站不住时只亮暗号。
 *   闪（depart → arrive，提交后）：先在原位核对完整身体空间，站得住才瞬移过去；**成功离位之后**才清除原点范围内
 *     允许失去目标的追击关系，再让原地位炸开、落点收束；野生的个体挪得更远，并松开自己手里的目标（逃走）。
 *
 * 与同族分开：接棒把等级递给别人、急速折返/快速折返撞一下再走、伏特替换放电后瞬移；只有瞬间移动**不留任何东西**，
 *   落点由玩家选自由三维点，是可反复使用（冷却短）的脱身。终点不合法就解释失败，不凭空脱战、也不盲推。
 * 提交前只观察、只 present；位移、脱锁与粒子都在提交后写。
 */
namespace PokemonSkills {
    /** 是否为野生个体（只有宝可梦有这个概念；其他生物当作非野生）。 */
    function teleportWild(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        return !!CobblemonCombat.pokemon(actor).wild();
    }

    /**
     * 核对一个自由三维落点：脚底中心必须与原点拉开距离、落在 blinkRange 内，且整个碰撞箱站得下。
     * 空字符串表示合法；否则返回可直接交给 ready 的失败原因。途中不要求走通，只看终点。
     */
    function teleportLanding(world: CombatWorld, point: CombatPoint, body: CombatObservation, range: number): string {
        const delta = point.minus(body.position());
        if (delta.length() < 0.15) return "invalid-target";
        if (delta.length() > range + 0.05) return "out-of-range";
        return world.freeSpace(point, body.width(), body.height()) ? "" : "path-blocked";
    }

    define({
        freeMovement: true,
        id: teleportId,
        cooldownParameter: "recharge",
        name: "Teleport",
        description: "折叠空间瞬移到手动选定的真实三维落点，甩掉盯着自己的敌人；终点站不住会直接失败。野生的个体挪得更远并松开自己的目标。不留任何东西，冷却短。",
        uses: ["被贴住时瞬间拉开距离", "甩掉正盯着自己的追兵", "越上崖顶或平台挪到安全处"],
        kind: "point",
        range: 9,
        maxRange: 20,
        prepare: 4,
        active: 0,
        recover: 5,
        cooldown: 60,
        style: "blink",
        defaults: { far: false, ai: { retreatBelow: 0.35, maxChase: 14, leaveStation: false } },
        fields: [flag("far", "远遁闪")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[teleportId], detail: { values: config } };
            return {
                radius: p(teleportId, "blinkRange", context), geometry: "line", style: "blink", color: 0x8AB6FF,
                label: config && config.far ? "瞬间移动·远遁" : "瞬间移动"
            };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[teleportId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(teleportId, "tempo", context)),
                recover: Math.round(p(teleportId, "aftercast", context)),
                cooldown: Math.round(p(teleportId, "recharge", context)),
                active: 0,
                range: p(teleportId, "blinkRange", context)
            };
        },
        ready: function (action) {
            const sense = action.sense(), body = sense.observe(action.actor());
            if (body === null) return "invalid-target";
            return teleportLanding(sense, action.targetPosition(), body, p(teleportId, "blinkRange", action));
        },
        windup: function (action, config, prepare) {
            const sense = action.sense(), body = sense.observe(action.actor());
            const chosen = action.targetPosition();
            const motes = Math.max(8, Math.round(p(teleportId, "motes", action)));
            const scale = Math.max(0.6, Math.min(1.8, motes / 24));
            const pulse = Math.max(8, Math.min(30, Math.round(motes / 2)));
            const wild = teleportWild(sense, action.actor());
            action.present("world_combat:move_teleport:fold", teleportScene, 1, action.origin(),
                JSON.stringify({ moment: "fold", far: config && config.far ? 1 : 0, wild: wild ? 1 : 0, motes: motes, pulse: pulse, scale: scale }));
            // 落点小门：只有终点真的站得下才亮成可落点，否则亮暗号。
            const gate = body !== null && teleportLanding(sense, chosen, body, p(teleportId, "blinkRange", action)) === "";
            action.present("world_combat:move_teleport:gate", teleportScene, 1, chosen,
                JSON.stringify({ moment: gate ? "gate" : "denied", point: [chosen.x(), chosen.y(), chosen.z()],
                    motes: motes, pulse: pulse, scale: scale, wild: wild ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const range = p(teleportId, "blinkRange", action);
            const shedRadius = p(teleportId, "shedRadius", action);
            const motes = Math.max(8, Math.round(p(teleportId, "motes", action)));
            const wild = teleportWild(world, self);
            const scale = Math.max(0.6, Math.min(1.8, motes / 24));
            const pulse = Math.max(8, Math.min(30, Math.round(motes / 2)));
            const chosen = action.targetPosition();
            const reason = teleportLanding(world, chosen, body, range);
            if (reason !== "") {
                // 终点站不住：只报告失败，不闪、不脱战。
                WorldFeedback.emit(world, teleportScene, 1, chosen,
                    { moment: "denied", motes: motes, scale: scale, wild: wild ? 1 : 0 }, 18);
                world.sound("minecraft:block.beacon.deactivate", origin, 12, "{}");
                done(action);
                return;
            }
            if (!world.teleport(self, chosen)) {
                // 原生位移被拒：同样只报告失败。
                WorldFeedback.emit(world, teleportScene, 1, chosen,
                    { moment: "denied", motes: motes, scale: scale, wild: wild ? 1 : 0 }, 18);
                done(action);
                return;
            }
            const landed = world.observe(self);
            const at = landed === null ? chosen : landed.position();
            const travelled = at.minus(origin).length();

            // 只有真的离位之后，才清除原点范围内盯着自己的追击关系。
            let shed = 0;
            const near = world.query(origin, shedRadius, false);
            for (let index = 0; index < near.length; index++) {
                const other = near[index];
                if (String(other.ref()) === String(self.ref()) || world.friendly(other)) continue;
                const facts = world.observe(other);
                if (facts === null || facts.health() <= 0) continue;
                const chasing = facts.attacking();
                if (chasing === null || String(chasing.ref()) !== String(self.ref())) continue;
                if (world.target(other, null)) shed++;
            }

            WorldFeedback.emit(world, teleportScene, 1, origin,
                { moment: "depart", motes: motes, pulse: pulse, sheared: shed, wild: wild ? 1 : 0, scale: scale }, 22);
            WorldFeedback.emit(world, teleportScene, 1, at,
                { moment: "arrive", motes: motes, pulse: pulse, sheared: shed, wild: wild ? 1 : 0,
                    flash: wild ? 16 : 0,
                    intensity: Math.max(0.7, Math.min(2, 0.7 + shed / 3)), scale: scale }, 24);
            if (wild) world.target(self, null);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), wild ? teleportWildText : teleportText,
                [Math.round(travelled * 10) / 10], 26);
            world.sound("minecraft:entity.enderman.teleport", origin, 16, "{}");
            world.sound("minecraft:entity.player.teleport", at, 12, "{}");
            done(action);
        }
    });
}
