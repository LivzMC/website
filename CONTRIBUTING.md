# Contributing

If you are confused on where to start, you can always join our [Discord](https://discord.gg/XE9CNP6E) and ask.

## Requirements

What contributing to this project requires:

- NodeJS, and npm
- Git
- MySQL server

### Getting started

If you need to install the required dependencies, here can probably help:
*note: If you are using a Linux distro not mentioned, you can open a pull request with instructions*

- NodeJS, and npm
  - Ubuntu:
    - `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash`
    - `source ~/.bashrc`
    - `nvm install latest`
    - `npm --version`
  - Windows
    - go to `https://nodejs.org/en/download/current`
    - `npm --version`
- Git
  - Windows
    - go to `https://git-scm.com/downloads`
- MySQL Server

  Now this is a bit more advanced to setup. I would just recommend creating a database cluster through [Digitalocean](https://digitalocean.com), or a cheaper option is creating a droplet and hosting LivzMC on it with a MySQL server running on it [tutorial](https://www.digitalocean.com/community/tutorials/how-to-install-mysql-on-ubuntu-20-04)

What you will need to do to get started is the following:

- Clone the repo
  You will need to fork and clone the Git repository.

  First, fork the repository by going here: <https://github.com/LivzMC/website/fork>

  Run the command `git clone https://github.com/<owner>/website.git` and then run the command `git submodule update --init --recursive` to download the `LivzMC` submodule.
- Install the dependencies
  Run the command `npm install`
- Modify a src file with the changes you want
- Preview your changes
  Run the command `npm run devStart`. This will run the website and restart the server if a .ts file is saved since I am using nodemon.
- Build the source
  Run the command `npm run build`. If there are warnings or errors, please fix them. When building there should never be any warnings or errors.

### General rules

There are some general rules to the code styling that I will want to be followed.

1. all files should be using the LF line ending.
2. I do not want any `any`, `unknown` types. If you *have* to use it ([example](./src/managers/database/MySQLConnection.ts)) then add `// eslint-disable-line @typescript-eslint/no-explicit-any` to the line.
3. All arrays or objects that take multiple objects must end with a comma `,`. Example:

    ```js
      const object = {
        test,
        test2,
        test3,
      };

      const array = [
        "test",
        "test2",
        "test3",
      ];
    ```

4. This rule is not really an eforced one, but generally wanted and liked. Please add comments explaining your changes.

#### Pushing changes

To push your changes run these commands:

```bash
git add *
git commit -m "<description of changes>"
git push
```

Once the changes have been pushed to your forked repository, go to GitHub and open a pull request with your changes.
Always provide a good title describing your changes and a body.
