const router = require('express').Router();
const isLoggedIn = require('../auth/check-login').isLoggedIn;

const knexfile = require("../knexfile").development;
const knex = require("knex")(knexfile);

const fs = require('fs');

//routes
router.get('/createusername', isLoggedIn, (req, res) => {
    if (!req.user.username) {
        res.render("createUsername");
    } else {
        res.redirect('/profile/createprofile')
    }
    
});

router.post('/createusername', async (req, res) => {
    
    const userId = req.user.id;
    const username = req.body.username;

    await knex('users')
        .where({ id: userId })
        .update({ username: username });

    res.redirect('/profile/createprofile')
})

router.get('/createprofile', isLoggedIn, async (req, res) => {
    let userProfile = await knex('user_profiles').where({ user_id: req.user.id }).first();
    let companyProfile = await knex('company_profiles').where({ user_id: req.user.id }).first();

    if (userProfile || companyProfile) {
        res.redirect(`/profile/${req.user.username}`);
    } else {
        res.render("createProfile");
    }
})

router.post('/createprofile', async (req, res) => {

    const user_id = req.user.id;

    const newUserProfile = {
        first_name: req.body.firstname,
        last_name: req.body.lastname,
        about_section: req.body.aboutme,
        user_id: user_id
    }

    const newCompanyProfile = {
        company_name: req.body.companyname,
        company_website: req.body.companywebsite,
        company_description: req.body.companydescription,
        headcount: req.body.headcount,
        company_remote: req.body.companyremote,
        about_us_heading: req.body.aboutusheader,
        about_us_description: req.body.aboutusdescription,
        user_id: user_id
    }

    const newProject = {
        project_name: req.body.projectheader,
        project_description: req.body.projectdescription,
        user_profile_id: user_id
    }

    if (req.body.user_type === "user") {
        await knex('user_profiles').insert(newUserProfile)
        await knex('user_projects').insert(newProject);
    } else {
        await knex('company_profiles').insert(newCompanyProfile);
    }

    res.redirect(`/profile/${req.user.username}`);
})

router.get('/edituserprofile', isLoggedIn, async (req, res) => {
    const id = req.user.id;
    const userInfo = await knex("user_profiles").where({ user_id: id }).first();
    const projectInfo = await knex("user_projects").where({ user_profile_id: id }).first();
    res.render("userEditProfile", {userInfo: userInfo, projectInfo: projectInfo});
})

router.post('/edituserprofile', async (req, res) => {
    const id = req.user.id;

    const profilePic = req.files.profilepic;
    const profilePicName = 'profilepicture' + req.user.id;
    const profilePicDestination = "public/images/profilepics";
    
    if (profilePic) {
        profilePic.mv(`${profilePicDestination}/${profilePicName}`, (err) => {
            if (err) {
                console.log(err);
            }
        });
    }
    
    const projectPics = [
        { file: req.files.projectpic1, name: 'projectpicture1' },
        { file: req.files.projectpic2, name: 'projectpicture2' },
        { file: req.files.projectpic3, name: 'projectpicture3' },
    ];

    const projectPicDestination = 'public/images/projectpics';

    for (let i = 0; i < projectPics.length; i++) {
        const { file, name } = projectPics[i];
        const newFileName = name + req.user.id;

        if (file) {
            file.mv(`${projectPicDestination}/${newFileName}`, (err) => {
                if (err) {
                    console.log(err);
                };
            });    
        }
    };

    const updateUserProfile = {
        first_name: req.body.firstname,
        last_name: req.body.lastname,
        about_section: req.body.aboutme,
    }

    const updateProjectInfo = {
        project_name: req.body.projectheader,
        project_description: req.body.projectdescription,
        user_profile_id: id
    }

    await knex('user_profiles').where({ user_id: id }).update(updateUserProfile);
    await knex('user_projects').where({ user_profile_id: id }).update(updateProjectInfo);
    res.redirect('/');
})


router.get('/editcompanyprofile', isLoggedIn, async (req, res) => {
    const id = req.user.id;
    const companyInfo = await knex("company_profiles").where({user_id: id}).first();
    res.render("companyEditProfile", {companyInfo: companyInfo});
})

router.post('/editcompanyprofile', async (req, res) => {
    const id = req.user.id;
    const updateCompanyProfile = {
        company_name: req.body.companyname,
        company_website: req.body.companywebsite,
        company_description: req.body.companydescription,
        headcount: req.body.headcount,
        company_remote: req.body.companyremote,
        about_us_heading: req.body.aboutusheader,
        about_us_description: req.body.aboutusdescription,
    }

    await knex('company_profiles').where({user_id: id}).update(updateCompanyProfile);
    res.redirect('/');
})

router.get('/:myprofile', async (req, res) => {
    let username = req.params.myprofile;

    const userInfo = await knex('users')
        .select()
        .join('user_profiles', 'users.id', '=', 'user_profiles.user_id')
        .join('user_projects', 'users.id', '=', 'user_projects.user_profile_id')
        .where({ username }).first()

    let profilePic = [
        {name: "profilepicture", userId: userInfo.user_id },
    ];
    
    const profilePicPath = profilePic.map(pic => {
        const imagePath = `/images/profilepics/profilepicture${pic.userId}`;
        const exists = fs.existsSync(`public${imagePath}`);
        return exists ? imagePath : null;
    });

    const projectPics = [
      { name: "projectpicture1", userId: userInfo.user_id },
      { name: "projectpicture2", userId: userInfo.user_id },
      { name: "projectpicture3", userId: userInfo.user_id },
    ];

    const imagePaths = projectPics.map(pic => {
        const imagePath = `/images/projectpics/${pic.name}${pic.userId}`;
        const exists = fs.existsSync(`public${imagePath}`);
        return exists ? imagePath : null;
    })
    
    res.render("profile", { userInfo: userInfo, imagePaths: imagePaths, profilePicPath: profilePicPath });
});

module.exports = router;