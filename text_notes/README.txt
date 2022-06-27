package.json specifies browser support
Setting quick_compile to true skips installing python and node modules

Choose a good font:
- Noto Sans
- Segoe UI
- Roboto
- Helvetica Neue


Get Postgres URI from Heroku, save as environment variabe in DATABASE_URL

-- Restructuring outreach data --
initiative-id: [{
    initiative-name: "",
    lead: [
        {
            timestamp: num,
            time: num
        }
    ],
    regular: [
        {
            timestamp: num,
            time: num
        }
    ]
},
...
]


Data format (rough draft):

cookie-map:
{
    cookie-uuid: {
        token: TokenObject,
        googleID: google_user_id,
        tags: [student | manager | admin | super-admin],
        subteam: subteam-name
    }
}

outreach:
{
    google_user_id: {
        initiative_data: "{
            initiative_id_1: {
                lead: {
                    // Timestamp entered: amount entered
                    Date.now(): hours
                },
                regular: {
                    // Timestamp entered: amount entered
                    Date.now(): hours
                }
            }
        }"
    }
}

initiatives:
{
    initiative_id_1: {
        name: initiative_name (max 200 chars),
        participants: count,
        engagement: "hours:minutes",
        order-id: #,
        description: initiative_description (max 5000 chars),
        // Does this initiative have leadership prep hours
        lead: boolean,
        // Does this initiative have participating hours
        regular: boolean
    }
}